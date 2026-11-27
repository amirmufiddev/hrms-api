import { ServiceUnavailableException } from '@nestjs/common';
import { DevicePace } from './device/device-pace';
import { DeviceLogPullService } from './device-log-pull.service';

const ready = {
  id: 'dev-1',
  tenantId: 'tenant-1',
  code: 'GATE-01',
  serialNumber: 'SN1',
  host: '10.0.0.8',
  webPort: 80,
  webPassword: 'secret',
  active: true,
};

const pullOptions = { deviceId: 'dev-1', from: 0, maxPages: 10 };

function logResult(rows: unknown[]) {
  return { rows, nextFrom: 0, done: true };
}

function service(overrides: {
  devices?: unknown[];
  getLogs?: jest.Mock;
  ingest?: jest.Mock;
  update?: jest.Mock;
  pace?: DevicePace;
}) {
  const prisma = {
    attendanceDevice: {
      findMany: jest.fn().mockResolvedValue(overrides.devices ?? [ready]),
      update: overrides.update ?? jest.fn().mockResolvedValue({}),
    },
  };
  const logs = {
    getLogs: overrides.getLogs ?? jest.fn().mockResolvedValue(logResult([])),
  };
  const ingest = { ingest: overrides.ingest ?? jest.fn().mockResolvedValue({ results: [] }) };
  return {
    svc: new DeviceLogPullService(prisma as never, logs as never, ingest as never, overrides.pace),
    prisma,
    logs,
    ingest,
  };
}

describe('DeviceLogPullService', () => {
  it('mengirim tap ternormalisasi dalam batch dan mengisi lastPulledAt', async () => {
    const rows = Array.from({ length: 2 }, (_, index) => ({
      enrollid: String(index + 1),
      time: '2026-11-01 10:00:00',
      mode: 3,
      inout: 0,
    }));
    const { svc, logs, ingest, prisma } = service({
      getLogs: jest.fn().mockResolvedValue(logResult(rows)),
    });
    await svc.pullOnce();
    expect(logs.getLogs).toHaveBeenCalledWith(
      { host: '10.0.0.8', webPort: 80, password: 'secret' },
      pullOptions,
    );
    expect(ingest.ingest).toHaveBeenCalledWith('tenant-1', {
      deviceCode: 'GATE-01',
      serialNumber: 'SN1',
      punches: [
        { nik: '1', punchedAt: '2026-11-01T10:00:00+07:00', verifyMode: 'CARD', deviceState: 0 },
        { nik: '2', punchedAt: '2026-11-01T10:00:00+07:00', verifyMode: 'CARD', deviceState: 0 },
      ],
    });
    expect(prisma.attendanceDevice.update).toHaveBeenCalledWith({
      where: { id: 'dev-1' },
      data: { lastPulledAt: expect.any(Date), lastPullError: null },
    });
  });

  it('mesin tanpa password tidak memanggil getlog', async () => {
    const { svc, logs, prisma } = service({ devices: [{ ...ready, webPassword: '  ' }] });
    await svc.pullOnce();
    expect(logs.getLogs).not.toHaveBeenCalled();
    expect(prisma.attendanceDevice.update).toHaveBeenCalledWith({
      where: { id: 'dev-1' },
      data: { lastPullError: 'DEVICE_NOT_CONFIGURED' },
    });
  });

  it('satu mesin mati tidak menghentikan mesin berikutnya', async () => {
    const second = { ...ready, id: 'dev-2', code: 'GATE-02', host: '10.0.0.9' };
    const getLogs = jest.fn(async (endpoint: { host: string }) => {
      if (endpoint.host === '10.0.0.8') throw new ServiceUnavailableException('DEVICE_OFFLINE');
      return logResult([{ enrollid: '9', time: '2026-11-01 10:00:00', mode: 3, inout: 0 }]);
    });
    const update = jest.fn().mockResolvedValue({});
    const { svc, ingest } = service({ devices: [ready, second], getLogs, update });
    await svc.pullOnce();
    expect(ingest.ingest).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ where: { id: 'dev-1' }, data: { lastPullError: 'DEVICE_OFFLINE' } });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'dev-2' },
      data: { lastPulledAt: expect.any(Date), lastPullError: null },
    });
  });

  it('siklus kedua menunggu siklus pertama', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let firstGetLogsStarted: () => void = () => undefined;
    const firstInvocation = new Promise<void>((resolve) => {
      firstGetLogsStarted = resolve;
    });
    const getLogs = jest.fn(async () => {
      firstGetLogsStarted();
      await gate;
      return logResult([]);
    });
    const { svc, logs } = service({ getLogs });
    const first = svc.pullOnce();
    const second = svc.pullOnce();
    await firstInvocation;
    expect(logs.getLogs).toHaveBeenCalledTimes(1);
    release();
    await first;
    await second;
    expect(logs.getLogs).toHaveBeenCalledTimes(2);
  });

  it('batch ingest yang gagal tidak mengisi lastPulledAt', async () => {
    const update = jest.fn().mockResolvedValue({});
    const { svc, logs } = service({
      update,
      getLogs: jest.fn().mockResolvedValue(
        logResult([{ enrollid: '1', time: '2026-11-01 10:00:00', mode: 3, inout: 0 }]),
      ),
      ingest: jest.fn().mockRejectedValue(new Error('BATCH_TOO_LARGE')),
    });
    await svc.pullOnce();
    expect(update).toHaveBeenCalledWith({ where: { id: 'dev-1' }, data: { lastPullError: 'BATCH_TOO_LARGE' } });
    expect(logs.getLogs).toHaveBeenCalled();
  });

  it('halaman yang tidak muat dilanjutkan dari penunjuk, bukan dari nol', async () => {
    const pace = new DevicePace({ now: () => 0, wait: async () => undefined });
    const froms: number[] = [];
    const row = { enrollid: '1', time: '2026-11-06 00:00:00', mode: 1, inout: 0 };
    const ingestMock = jest.fn().mockResolvedValue({ results: [] });
    const update = jest.fn().mockResolvedValue({});
    const { svc, ingest, prisma } = service({
      pace,
      update,
      ingest: ingestMock,
      getLogs: jest.fn(async (_endpoint: unknown, options: { from: number }) => {
        froms.push(options.from);
        return { rows: [row], nextFrom: options.from + 500, done: false };
      }),
    });
    await svc.pullOnce();
    await svc.pullOnce();
    expect(froms[1]).toBe(500);
    expect(ingest.ingest).toHaveBeenCalledWith('tenant-1', {
      deviceCode: 'GATE-01',
      serialNumber: 'SN1',
      punches: [{ nik: '1', punchedAt: '2026-11-06T00:00:00+07:00', verifyMode: 'FINGER', deviceState: 0 }],
    });
    expect(prisma.attendanceDevice.update).not.toHaveBeenCalled();
  });

  it('list mengembalikan mesin aktif tenant', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'dev-1', code: 'GATE-01', lastPulledAt: null, lastPullError: 'DEVICE_OFFLINE' },
    ]);
    const prisma = { attendanceDevice: { findMany, update: jest.fn() } };
    const svc = new DeviceLogPullService(prisma as never, {} as never, {} as never);
    await expect(svc.list('tenant-1')).resolves.toEqual({
      devices: [{ id: 'dev-1', code: 'GATE-01', lastPulledAt: null, lastPullError: 'DEVICE_OFFLINE' }],
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', active: true, deletedAt: null },
      select: { id: true, code: true, lastPulledAt: true, lastPullError: true },
      orderBy: { code: 'asc' },
    });
  });
});
