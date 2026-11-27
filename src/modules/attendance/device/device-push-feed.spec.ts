import { DevicePushFeed, pushSlotLabel } from './device-push-feed';

describe('DevicePushFeed', () => {
  it('menampilkan kiriman tenant ini dan mesin yang tidak dikenal', () => {
    const feed = new DevicePushFeed();
    feed.add({ tenantId: 'tenant-1', kind: 'sendlog', deviceCode: '01', nik: '900002', detail: 'CARD', ok: true, message: 'Tersimpan' });
    feed.add({ tenantId: 'tenant-2', kind: 'sendlog', deviceCode: '09', nik: '1', detail: 'CARD', ok: true, message: 'Tersimpan' });
    feed.add({ tenantId: null, kind: 'reg', deviceCode: '', nik: '', detail: 'Mesin terhubung', ok: false, message: 'Mesin tidak dikenal' });
    const rows = feed.list('tenant-1');
    expect(rows.map((row) => row.deviceCode)).toEqual(['', '01']);
    expect(rows[0]).not.toHaveProperty('tenantId');
  });

  it('menyimpan delapan puluh kiriman terbaru', () => {
    const feed = new DevicePushFeed();
    for (let index = 0; index < 90; index += 1) {
      feed.add({ tenantId: 'tenant-1', kind: 'senduser', deviceCode: '01', nik: String(index), detail: 'Sidik slot 0', ok: true, message: 'Tersimpan' });
    }
    const rows = feed.list('tenant-1');
    expect(rows).toHaveLength(80);
    expect(rows[0]?.nik).toBe('89');
    expect(rows.at(-1)?.nik).toBe('10');
  });

  it('memberi nama slot tanpa menyertakan isi template', () => {
    expect(pushSlotLabel(0)).toBe('Sidik slot 0');
    expect(pushSlotLabel(51)).toBe('Wajah');
    expect(pushSlotLabel(11)).toBe('Kartu');
  });
});
