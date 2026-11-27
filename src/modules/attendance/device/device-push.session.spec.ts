import { DevicePushSession, PushSocket } from './device-push.session';

function socket(): PushSocket & { sent: string[] } {
  return {
    readyState: 1,
    sent: [],
    send(data: string) {
      this.sent.push(data);
    },
  };
}

it('mengirim perintah ke soket mesin dan menyelesaikan jawaban ret', async () => {
  const session = new DevicePushSession();
  const link = socket();
  session.attach('::ffff:10.21.22.3', link);
  const pending = session.send('10.21.22.3', { cmd: 'setuserinfo', enrollid: 900037, backupnum: 51, record: 'wajah' }, 1000);
  expect(link.sent).toHaveLength(1);
  expect(JSON.parse(link.sent[0])).toEqual({ cmd: 'setuserinfo', enrollid: 900037, backupnum: 51, record: 'wajah' });
  expect(session.takeReply(link, { cmd: 'sendlog', record: [] })).toBe(false);
  expect(session.takeReply(link, { ret: 'setuserinfo', result: true })).toBe(true);
  await expect(pending).resolves.toMatchObject({ ret: 'setuserinfo', result: true });
});

it('menolak kirim bila mesin tidak tersambung', async () => {
  const session = new DevicePushSession();
  await expect(session.send('10.21.22.3', { cmd: 'setuserinfo' }, 1000)).rejects.toThrow('DEVICE_OFFLINE');
});

it('melepas perintah yang menunggu saat soket tertutup', async () => {
  const session = new DevicePushSession();
  const link = socket();
  session.attach('10.21.22.17', link);
  const pending = session.send('10.21.22.17', { cmd: 'deleteusers', list: ['900030'] }, 1000);
  session.detach(link);
  await expect(pending).rejects.toThrow('DEVICE_OFFLINE');
});
