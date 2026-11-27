import { jakartaDayWindow } from './jakarta-day';

describe('jakartaDayWindow', () => {
  it('membuka hari Jakarta dari 00:00 sampai 23:59:59.999', () => {
    const window = jakartaDayWindow('2026-10-16');
    expect(window?.start.toISOString()).toBe('2026-10-15T17:00:00.000Z');
    expect(window?.end.toISOString()).toBe('2026-10-16T16:59:59.999Z');
  });

  it('menolak tanggal yang tidak ada', () => {
    expect(jakartaDayWindow('2026-02-31')).toBeNull();
    expect(jakartaDayWindow('16-10-2026')).toBeNull();
  });
});
