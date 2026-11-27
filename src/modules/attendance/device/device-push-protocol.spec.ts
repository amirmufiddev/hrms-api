import { answerDevice, cloudTime } from './device-push-protocol';

const now = new Date('2026-10-17T17:12:00.000Z');

describe('answerDevice', () => {
  it('menjawab reg supaya mesin mulai mengirim', () => {
    const answer = answerDevice({ cmd: 'reg' }, now);
    expect(answer.logs).toEqual([]);
    expect(answer.reply).toMatchObject({ ret: 'reg', result: true, cloudtime: cloudTime(now) });
  });

  it('membiarkan mesin mengirim pendaftaran baru', () => {
    const answer = answerDevice({ cmd: 'reg', sn: 'AXUD28053047' }, now);
    expect(answer.reply).not.toHaveProperty('nosenduser');
    expect(answer.enrollment).toBeNull();
  });

  it('mengambil sidik atau wajah dari senduser', () => {
    const answer = answerDevice({ cmd: 'senduser', enrollid: 900002, name: 'Aditia', backupnum: 51, record: 'wajah' }, now);
    expect(answer.logs).toEqual([]);
    expect(answer.enrollment).toEqual({ enrollId: '900002', name: 'Aditia', backupnum: 51, record: 'wajah' });
    expect(answer.reply).toMatchObject({ ret: 'senduser', result: true });
  });

  it('menolak senduser tanpa NIK', () => {
    const answer = answerDevice({ cmd: 'senduser', backupnum: 0, record: 'sidik' }, now);
    expect(answer.enrollment).toBeNull();
    expect(answer.reply).toMatchObject({ ret: 'senduser', result: false, reason: 1 });
  });

  it('mengambil record dari sendlog', () => {
    const record = [{ enrollid: 260061, time: '2026-10-18 05:12:00', mode: 3, inout: 0 }];
    const answer = answerDevice({ cmd: 'sendlog', record }, now);
    expect(answer.logs).toEqual(record);
    expect(answer.reply.ret).toBe('sendlog');
    expect(answer.reply.result).toBe(true);
  });
});
