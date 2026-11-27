import { ServiceUnavailableException } from '@nestjs/common';
import { DeviceCommandGate } from './device-command-gate';
import { DeviceLogClient } from './device-log-client';
import { DevicePace } from './device-pace';

function client() {
  const gate = new DeviceCommandGate();
  gate.gapMs = 0;
  const pace = new DevicePace({ now: () => 0, wait: async () => undefined });
  return new DeviceLogClient(gate, pace);
}

const endpoint = { host: '10.0.0.8', webPort: 80, password: 'secret' };
const pullOptions = { deviceId: 'dev-log-1', from: 0, maxPages: 40 };

describe('DeviceLogClient', () => {
  const original = global.fetch;

  afterEach(() => {
    global.fetch = original;
  });

  it('mengambil getlog per halaman sampai record habis', async () => {
    const bodies: unknown[] = [];
    global.fetch = jest.fn(async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      const page = bodies.length;
      const payload =
        page === 1
          ? { record: [{ enrollid: '1', time: '2026-11-01 10:00:00' }], to: 500, count: 501 }
          : { record: [], to: 500, count: 501 };
      return { ok: true, text: async () => JSON.stringify(payload) } as Response;
    }) as typeof fetch;

    const result = await client().getLogs(endpoint, pullOptions);
    expect(result.rows).toHaveLength(1);
    expect(result.done).toBe(true);
    expect(bodies[0]).toMatchObject({ cmd: 'getlog', from: 0, to: 500, password: 'secret' });
    expect(bodies[1]).toMatchObject({ cmd: 'getlog', from: 500, to: 1000 });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://10.0.0.8:80/api',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('menolak balasan result false sebagai DEVICE_REJECTED', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => JSON.stringify({ result: false }) }) as Response);
    await expect(client().getLogs(endpoint, pullOptions)).rejects.toMatchObject({ message: 'DEVICE_REJECTED' });
  });

  it('fetch yang gagal menjadi DEVICE_OFFLINE', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('network');
    });
    await expect(client().getLogs(endpoint, pullOptions)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('mesin diam tidak memanggil fetch untuk mesin itu saja', async () => {
    const gate = new DeviceCommandGate();
    gate.gapMs = 0;
    const pace = new DevicePace({ now: () => 0, wait: async () => undefined });
    pace.markOffline('dev-1');
    const client = new DeviceLogClient(gate, pace);
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      text: async () => JSON.stringify({ record: [], to: 0, count: 0 }),
    } as Response);
    await client.getLogs(endpoint, { deviceId: 'dev-1', from: 0, maxPages: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
    await client.getLogs(endpoint, { deviceId: 'dev-2', from: 0, maxPages: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });
});
