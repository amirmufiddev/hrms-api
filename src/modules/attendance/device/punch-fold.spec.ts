import { attendanceDateKey, buildSessions, mapDeviceState, summarizeDay } from './punch-fold';

describe('mapDeviceState', () => {
  it('memetakan kode ZK', () => {
    expect(mapDeviceState(0, false)).toBe('IN');
    expect(mapDeviceState(1, true)).toBe('OUT');
    expect(mapDeviceState(4, false)).toBe('IN');
    expect(mapDeviceState(5, true)).toBe('OUT');
  });

  it('kode lain mengikuti sesi terbuka', () => {
    expect(mapDeviceState(null, false)).toBe('IN');
    expect(mapDeviceState(9, true)).toBe('OUT');
  });
});

describe('attendanceDateKey', () => {
  it('memakai tanggal kalender Jakarta tanpa shift', () => {
    expect(attendanceDateKey(new Date('2026-10-16T01:00:00.000Z'), null)).toBe('2026-10-16');
  });

  it('menempelkan tap sebelum akhir shift malam ke tanggal mulai', () => {
    const shift = { startTime: '22:00', endTime: '06:00', graceMinutes: 15 };
    expect(attendanceDateKey(new Date('2026-10-16T23:10:00.000Z'), shift)).toBe('2026-10-16');
  });

  it('tap sesudah grace masuk tanggal baru', () => {
    const shift = { startTime: '22:00', endTime: '06:00', graceMinutes: 15 };
    expect(attendanceDateKey(new Date('2026-10-16T23:16:00.000Z'), shift)).toBe('2026-10-17');
  });
});

describe('buildSessions', () => {
  it('mengurutkan tap menjadi masuk dan keluar tanpa membaca kode mesin', () => {
    const sessions = buildSessions([
      { punchedAt: new Date('2026-10-17T16:40:21.000Z'), deviceState: 0 },
      { punchedAt: new Date('2026-10-17T16:41:38.000Z'), deviceState: 0 },
      { punchedAt: new Date('2026-10-17T16:50:12.000Z'), deviceState: 0 },
    ]);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].inTime.toISOString()).toBe('2026-10-17T16:40:21.000Z');
    expect(sessions[0].outTime?.toISOString()).toBe('2026-10-17T16:41:38.000Z');
    expect(sessions[0].missingOut).toBe(false);
    expect(sessions[0].sessionMinutes).toBe(1);
    expect(sessions[1].outTime).toBeNull();
    const summary = summarizeDay(sessions);
    expect(summary.clockInTime?.toISOString()).toBe('2026-10-17T16:40:21.000Z');
    expect(summary.clockOutTime).toBeNull();
    expect(summary.workedMinutes).toBe(1);
  });

  it('dua tap berkode masuk menjadi jam masuk dan jam keluar', () => {
    const sessions = buildSessions([
      { punchedAt: new Date('2026-10-17T01:00:00.000Z'), deviceState: 0 },
      { punchedAt: new Date('2026-10-17T09:00:00.000Z'), deviceState: 0 },
    ]);
    const summary = summarizeDay(sessions);
    expect(summary.clockInTime?.toISOString()).toBe('2026-10-17T01:00:00.000Z');
    expect(summary.clockOutTime?.toISOString()).toBe('2026-10-17T09:00:00.000Z');
    expect(summary.workedMinutes).toBe(8 * 60);
    expect(sessions[0].missingOut).toBe(false);
  });

  it('mengabaikan tap yang jaraknya di bawah 60 detik', () => {
    const sessions = buildSessions([
      { punchedAt: new Date('2026-10-17T16:40:00.000Z'), deviceState: 0 },
      { punchedAt: new Date('2026-10-17T16:40:59.000Z'), deviceState: 0 },
      { punchedAt: new Date('2026-10-17T16:41:00.000Z'), deviceState: 1 },
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].inTime.toISOString()).toBe('2026-10-17T16:40:00.000Z');
    expect(sessions[0].outTime?.toISOString()).toBe('2026-10-17T16:41:00.000Z');
    expect(sessions[0].missingOut).toBe(false);
  });

  it('tap pertama tetap masuk walau kode mesin keluar', () => {
    const sessions = buildSessions([
      { punchedAt: new Date('2026-10-17T16:40:00.000Z'), deviceState: 1 },
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].inTime.toISOString()).toBe('2026-10-17T16:40:00.000Z');
    expect(sessions[0].outTime).toBeNull();
  });
});
