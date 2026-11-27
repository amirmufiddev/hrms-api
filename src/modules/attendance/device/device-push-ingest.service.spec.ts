import { DevicePushIngestService } from './device-push-ingest.service';

const gate = {
  id: 'dev-1',
  tenantId: 'tenant-1',
  code: 'GATE-01',
  serialNumber: 'SN1',
  host: '10.0.0.8',
};

function faces() {
  return { shareNewFace: jest.fn().mockResolvedValue([]) };
}

function service(devices: unknown[]) {
  const prisma = { attendanceDevice: { findMany: jest.fn().mockResolvedValue(devices) } };
  const ingest = { ingest: jest.fn().mockResolvedValue({ results: [] }) };
  const feed = { add: jest.fn() };
  const share = faces();
  return { svc: new DevicePushIngestService(prisma as never, ingest as never, feed as never, share as never), ingest, feed, share };
}

describe('DevicePushIngestService', () => {
  it('menyimpan sendlog ke mesin yang alamatnya sama', async () => {
    const { svc, ingest, feed } = service([gate]);
    const saved = await svc.accept('::ffff:10.0.0.8', [{ enrollid: '9', time: '2026-11-01 10:00:00', mode: 3, inout: 0 }], undefined);
    expect(saved).toBe(true);
    expect(feed.add).toHaveBeenCalledWith(expect.objectContaining({ kind: 'sendlog', nik: '9', ok: true, message: 'Tersimpan' }));
    expect(ingest.ingest).toHaveBeenCalledWith('tenant-1', {
      deviceCode: 'GATE-01',
      serialNumber: 'SN1',
      punches: [{ nik: '9', punchedAt: '2026-11-01T10:00:00+07:00', verifyMode: 'CARD', deviceState: 0 }],
    });
  });

  it('tidak menyimpan sidik yang dikirim mesin', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const directoryUpsert = jest.fn().mockResolvedValue({});
    const prisma = {
      attendanceDevice: { findMany: jest.fn().mockResolvedValue([gate]) },
      attendanceBiometricTemplate: { upsert },
      attendanceDeviceDirectory: { findUnique: jest.fn().mockResolvedValue(null), upsert: directoryUpsert },
      employee: { findMany: jest.fn(), update: jest.fn() },
    };
    const feed = { add: jest.fn() };
    const share = faces();
    const svc = new DevicePushIngestService(prisma as never, { ingest: jest.fn() } as never, feed as never, share as never);
    const saved = await svc.acceptEnrollment(
      '10.0.0.8',
      { enrollId: '900002', name: 'Aditia', backupnum: 0, record: 'sidik' },
      'SN1',
    );
    expect(saved).toBe(true);
    expect(upsert).not.toHaveBeenCalled();
    expect(directoryUpsert).not.toHaveBeenCalled();
    expect(feed.add).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'senduser', detail: 'Sidik slot 0', ok: true, message: 'Tidak disimpan' }),
    );
    expect(JSON.stringify(feed.add.mock.calls)).not.toContain('sidik');
    expect(share.shareNewFace).not.toHaveBeenCalled();
  });

  it('menyimpan foto wajah yang dikirim mesin', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const directoryUpsert = jest.fn().mockResolvedValue({});
    const prisma = {
      attendanceDevice: { findMany: jest.fn().mockResolvedValue([gate]) },
      attendanceBiometricTemplate: { upsert },
      attendanceDeviceDirectory: { findUnique: jest.fn().mockResolvedValue(null), upsert: directoryUpsert },
      employee: { findMany: jest.fn(), update: jest.fn() },
    };
    const feed = { add: jest.fn() };
    const share = faces();
    const svc = new DevicePushIngestService(prisma as never, { ingest: jest.fn() } as never, feed as never, share as never);
    const saved = await svc.acceptEnrollment(
      '10.0.0.8',
      { enrollId: '900684', name: 'Mukhlisan', backupnum: 50, record: 'foto-wajah' },
      'SN1',
    );
    expect(saved).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_nik_slot: { tenantId: 'tenant-1', nik: '900684', slot: 50 } },
        create: expect.objectContaining({ record: 'foto-wajah', sourceDeviceId: 'dev-1' }),
      }),
    );
    expect(directoryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ nik: '900684', face: 1, name: 'Mukhlisan' }) }),
    );
    expect(feed.add).toHaveBeenCalledWith(expect.objectContaining({ kind: 'senduser', detail: 'Foto', message: 'Tersimpan' }));
    expect(share.shareNewFace).toHaveBeenCalledWith('tenant-1', '900684', 'dev-1');
  });

  it('mengisi kartu HRMS yang masih kosong', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      attendanceDevice: { findMany: jest.fn().mockResolvedValue([gate]) },
      attendanceBiometricTemplate: { upsert: jest.fn() },
      attendanceDeviceDirectory: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({}) },
      employee: {
        findMany: jest.fn().mockResolvedValue([{ id: 'emp-1', employeeCode: '900002', cardNumber: null }]),
        update,
      },
    };
    const share = faces();
    const svc = new DevicePushIngestService(prisma as never, { ingest: jest.fn() } as never, { add: jest.fn() } as never, share as never);
    const saved = await svc.acceptEnrollment(
      '10.0.0.8',
      { enrollId: '900002', name: 'Aditia', backupnum: 11, record: '3690615179' },
      undefined,
    );
    expect(saved).toBe(true);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'emp-1' },
      data: expect.objectContaining({ cardNumber: '3690615179', cardPushStatus: 'PUSHED', deviceUid: 900002 }),
    });
    expect(share.shareNewFace).not.toHaveBeenCalled();
  });

  it('menolak push bila ada lebih dari satu mesin dan tidak ada yang cocok', async () => {
    const { svc, ingest } = service([gate, { ...gate, id: 'dev-2', code: 'GATE-02', host: '10.0.0.9' }]);
    await expect(svc.accept('192.168.1.9', [{ enrollid: '9', time: '2026-11-01 10:00:00', mode: 3, inout: 0 }], undefined)).resolves.toBe(false);
    expect(ingest.ingest).not.toHaveBeenCalled();
  });
});
