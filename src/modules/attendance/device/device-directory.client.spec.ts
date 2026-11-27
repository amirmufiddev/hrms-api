import { DeviceCommandGate } from './device-command-gate';
import { DeviceDirectoryClient } from './device-directory.client';
import { DevicePace } from './device-pace';
import { DevicePushSession } from './device-push.session';

function connectedSession(reply: Record<string, unknown> = { result: true }) {
  const sent: Record<string, unknown>[] = [];
  const session = {
    send: async (_host: string, body: Record<string, unknown>) => {
      sent.push(body);
      return reply;
    },
  } as unknown as DevicePushSession;
  return { session, sent };
}

it('perintah ke-11 tidak memanggil mesin', async () => {
  const gate = new DeviceCommandGate();
  gate.gapMs = 0;
  const pace = new DevicePace({ now: () => 0, wait: async () => undefined });
  const client = new DeviceDirectoryClient(gate, pace, new DevicePushSession());
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
    text: async () => JSON.stringify({ result: true, record: [] }),
  } as Response);
  const endpoint = { host: '10.0.0.1', webPort: 80, password: 'secret' };
  for (let index = 0; index < 10; index += 1) {
    await client.listUsers('dev-1', 'auto', endpoint);
  }
  await expect(client.listUsers('dev-1', 'auto', endpoint)).rejects.toMatchObject({ reason: 'BUDGET' });
  expect(fetchMock).toHaveBeenCalledTimes(10);
  fetchMock.mockRestore();
});

it('daftar manual yang lambat tidak membatalkan tulis template pada klik yang sama', async () => {
  let now = 1_000;
  const gate = new DeviceCommandGate();
  gate.gapMs = 0;
  const pace = new DevicePace({ now: () => now, wait: async () => undefined });
  const { session, sent: socketSent } = connectedSession();
  const client = new DeviceDirectoryClient(gate, pace, session);
  const endpoint = { host: '10.0.0.1', webPort: 80, password: 'secret' };
  const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async () => {
    now += 8_000;
    return { text: async () => JSON.stringify({ result: true, record: [], count: 0, to: 0 }) } as Response;
  });
  pace.armManual('dev-1');
  await client.listUsers('dev-1', 'manual', endpoint);
  await client.setBackup('dev-1', 'manual', endpoint, {
    enrollid: '900037',
    name: 'Muhamad Syarif Hidayat',
    backupnum: 51,
    record: 'wajah',
  });
  const sent = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body));
  expect(sent.enrollid).toBe(900037);
  expect(sent.backupnum).toBe(51);
  expect(sent).not.toHaveProperty('name');
  expect(sent).not.toHaveProperty('department');
  expect(socketSent).toHaveLength(0);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  pace.finishManualClick();
  await expect(client.listUsers('dev-1', 'auto', endpoint)).rejects.toMatchObject({ reason: 'QUIET' });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  fetchMock.mockRestore();
});

it('getUser result false tidak membuat mesin diam dan fetch tetap dipanggil', async () => {
  const gate = new DeviceCommandGate();
  gate.gapMs = 0;
  const pace = new DevicePace({ now: () => 0, wait: async () => undefined });
  const client = new DeviceDirectoryClient(gate, pace, new DevicePushSession());
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
    text: async () => JSON.stringify({ result: false, msg: 'rejected' }),
  } as Response);
  const endpoint = { host: '10.0.0.1', webPort: 80, password: 'secret' };
  await expect(client.getUser('dev-1', 'auto', endpoint, '900001')).rejects.toThrow('rejected');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(pace.quietDevices()).toEqual([]);
  fetchMock.mockRestore();
});

it('sidik tidak dikirim ke mesin', async () => {
  const gate = new DeviceCommandGate();
  gate.gapMs = 0;
  const pace = new DevicePace({ now: () => 0, wait: async () => undefined });
  const { session, sent } = connectedSession();
  const client = new DeviceDirectoryClient(gate, pace, session);
  const fetchMock = jest.spyOn(global, 'fetch');
  const stored = await client.setBackup('dev-1', 'manual', { host: '10.21.22.3', webPort: 80, password: 'secret' }, {
    enrollid: '900037',
    name: 'Pirman',
    backupnum: 0,
    record: 'c51e6f(1)abcd',
  });
  expect(stored).toBe(false);
  expect(sent).toHaveLength(0);
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockRestore();
});

it('sidik yang nol pertamanya tidak di byte keempat tidak dikirim', async () => {
  const gate = new DeviceCommandGate();
  gate.gapMs = 0;
  const pace = new DevicePace({ now: () => 0, wait: async () => undefined });
  const { session, sent } = connectedSession();
  const client = new DeviceDirectoryClient(gate, pace, session);
  const fetchMock = jest.spyOn(global, 'fetch');
  const stored = await client.setBackup('dev-1', 'manual', { host: '10.21.22.3', webPort: 80, password: 'secret' }, {
    enrollid: '900030',
    name: 'Muhamad Said Kosim Soleh',
    backupnum: 0,
    record: `c51d6b${'ab'.repeat(37)}(770)`,
  });
  expect(stored).toBe(false);
  expect(sent).toHaveLength(0);
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockRestore();
});

it('kartu memakai HTTP bila soket mesin tidak tersambung', async () => {
  const gate = new DeviceCommandGate();
  gate.gapMs = 0;
  const pace = new DevicePace({ now: () => 0, wait: async () => undefined });
  const client = new DeviceDirectoryClient(gate, pace, new DevicePushSession());
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
    text: async () => JSON.stringify({ result: true }),
  } as Response);
  await client.setUser('dev-1', 'manual', { host: '10.21.22.3', webPort: 80, password: 'secret' }, {
    enrollid: '900037',
    name: 'Pirman',
    card: 3690615179,
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
  expect(body).toEqual(expect.objectContaining({ cmd: 'setuserinfo', enrollid: '900037', card: 3690615179 }));
  expect(body.backupnum).toBeUndefined();
  fetchMock.mockRestore();
});

it('kartu dikirim lewat soket sebagai backupnum 11', async () => {
  const gate = new DeviceCommandGate();
  gate.gapMs = 0;
  const pace = new DevicePace({ now: () => 0, wait: async () => undefined });
  const { session, sent } = connectedSession();
  const client = new DeviceDirectoryClient(gate, pace, session);
  const fetchMock = jest.spyOn(global, 'fetch');
  await client.setUser('dev-1', 'manual', { host: '10.21.22.3', webPort: 80, password: 'secret' }, {
    enrollid: '900037',
    name: 'Pirman',
    card: 3690615179,
  });
  expect(sent[0]).toEqual({
    cmd: 'setuserinfo',
    enrollid: 900037,
    name: 'Pirman',
    backupnum: 11,
    admin: 0,
    record: 3690615179,
  });
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockRestore();
});

it('foto wajah dikirim lewat soket', async () => {
  const gate = new DeviceCommandGate();
  gate.gapMs = 0;
  const pace = new DevicePace({ now: () => 0, wait: async () => undefined });
  const { session, sent } = connectedSession();
  const client = new DeviceDirectoryClient(gate, pace, session);
  const fetchMock = jest.spyOn(global, 'fetch');
  await client.setBackup('dev-1', 'manual', { host: '10.21.22.3', webPort: 80, password: 'secret' }, {
    enrollid: '900084',
    name: 'Mukhlisan',
    backupnum: 50,
    record: '/9j/foto',
  });
  expect(sent[0]).toEqual(expect.objectContaining({ cmd: 'setuserinfo', backupnum: 50, enrollid: 900084, record: '/9j/foto' }));
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockRestore();
});
