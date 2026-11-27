import { PunchVerifyMode } from '@prisma/client';
import { normalizeDeviceLog } from './device-log-record';

describe('normalizeDeviceLog', () => {
  it('memetakan NIK, waktu Jakarta, dan kode firmware', () => {
    expect(
      normalizeDeviceLog({ enrollid: '206901', time: '2026-11-01 19:31:47', mode: 10, inout: 1 }),
    ).toEqual({
      nik: '206901',
      punchedAt: '2026-11-01T19:31:47+07:00',
      verifyMode: PunchVerifyMode.CARD_FACE,
      deviceState: 1,
    });
  });

  it('membuang NIK bukan angka dan waktu tanpa detik', () => {
    expect(normalizeDeviceLog({ enrollid: 'A1', time: '2026-11-01 19:31:47', mode: 3 })).toBeNull();
    expect(normalizeDeviceLog({ enrollid: '2', time: '01 Nov 19:31', mode: 3 })).toBeNull();
  });

  it('kode mode yang tidak dikenal menjadi UNKNOWN dan inout non-integer menjadi 0', () => {
    expect(normalizeDeviceLog({ enrollid: '2', time: '2026-11-01 19:31:47', mode: 6 })?.verifyMode).toBe(
      PunchVerifyMode.UNKNOWN,
    );
    expect(normalizeDeviceLog({ enrollid: '2', time: '2026-11-01 19:31:47', mode: 3 })?.deviceState).toBe(0);
  });
});
