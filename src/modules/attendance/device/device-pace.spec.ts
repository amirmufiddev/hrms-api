import { DevicePace } from './device-pace';

function clockAt(start: number) {
  let now = start;
  return {
    now: () => now,
    wait: async (ms: number) => {
      now += ms;
    },
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('DevicePace', () => {
  it('menolak perintah otomatis ke-11 pada jendela yang sama', async () => {
    const pace = new DevicePace(clockAt(0));
    for (let index = 0; index < 10; index += 1) {
      await expect(pace.allow('dev-1', 'auto')).resolves.toEqual({ ok: true });
    }
    await expect(pace.allow('dev-1', 'auto')).resolves.toEqual({
      ok: false,
      reason: 'BUDGET',
      quietUntil: null,
    });
  });

  it('tetap mengizinkan mesin kedua setelah mesin pertama habis', async () => {
    const pace = new DevicePace(clockAt(0));
    for (let index = 0; index < 10; index += 1) await pace.allow('dev-1', 'auto');
    await expect(pace.allow('dev-2', 'auto')).resolves.toEqual({ ok: true });
  });

  it('menunggu 3 detik sebelum perintah berikutnya ke mesin yang sama', async () => {
    const clock = clockAt(0);
    const pace = new DevicePace(clock);
    await pace.allow('dev-1', 'auto');
    const second = pace.allow('dev-1', 'auto');
    await expect(second).resolves.toEqual({ ok: true });
    expect(clock.now()).toBe(3000);
  });

  it('tidak menunggu 3 detik untuk mesin yang berbeda', async () => {
    const clock = clockAt(0);
    const pace = new DevicePace(clock);
    await pace.allow('dev-1', 'auto');
    await pace.allow('dev-2', 'auto');
    expect(clock.now()).toBe(0);
  });

  it('timeout mendiamkan mesin 10 menit', async () => {
    const clock = clockAt(1_000);
    const pace = new DevicePace(clock);
    const until = pace.markOffline('dev-1');
    expect(until.getTime()).toBe(1_000 + 10 * 60 * 1000);
    await expect(pace.allow('dev-1', 'auto')).resolves.toEqual({
      ok: false,
      reason: 'QUIET',
      quietUntil: until,
    });
    await expect(pace.allow('dev-1', 'manual')).resolves.toEqual({ ok: true });
    await expect(pace.allow('dev-2', 'auto')).resolves.toEqual({ ok: true });
  });

  it('membuka anggaran lagi setelah 2 menit', async () => {
    const clock = clockAt(0);
    const pace = new DevicePace(clock);
    for (let index = 0; index < 10; index += 1) await pace.allow('dev-1', 'auto');
    clock.advance(2 * 60 * 1000);
    await expect(pace.allow('dev-1', 'auto')).resolves.toEqual({ ok: true });
  });

  it('klik manual kedua pada jendela yang sama tetap diizinkan', async () => {
    const pace = new DevicePace(clockAt(0));
    await pace.allow('dev-1', 'manual');
    pace.markManualUsed('dev-1');
    await expect(pace.allow('dev-1', 'manual')).resolves.toEqual({ ok: true });
  });

  it('jeda 3 detik tetap berlaku setelah jendela anggaran berganti', async () => {
    const clock = clockAt(119_999);
    const pace = new DevicePace(clock);
    await pace.allow('dev-1', 'auto');
    clock.advance(119_998);
    await pace.allow('dev-1', 'auto');
    clock.advance(3);
    const third = pace.allow('dev-1', 'auto');
    await expect(third).resolves.toEqual({ ok: true });
    expect(clock.now()).toBe(242_997);
    await pace.allow('dev-2', 'auto');
    expect(clock.now()).toBe(242_997);
  });

  it('preview tidak mengonsumsi anggaran allow berikutnya', async () => {
    const pace = new DevicePace(clockAt(0));
    for (let index = 0; index < 10; index += 1) {
      expect(pace.preview('dev-1', 'auto')).toEqual({ ok: true });
    }
    for (let index = 0; index < 10; index += 1) {
      await expect(pace.allow('dev-1', 'auto')).resolves.toEqual({ ok: true });
    }
    await expect(pace.allow('dev-1', 'auto')).resolves.toEqual({
      ok: false,
      reason: 'BUDGET',
      quietUntil: null,
    });
  });

  it('klik manual boleh 8 perintah setelah anggaran otomatis habis', async () => {
    const pace = new DevicePace(clockAt(0));
    for (let index = 0; index < 10; index += 1) await pace.allow('dev-1', 'auto');
    for (let index = 0; index < 8; index += 1) {
      await expect(pace.allow('dev-1', 'manual')).resolves.toEqual({ ok: true });
    }
    await expect(pace.allow('dev-1', 'manual')).resolves.toEqual({
      ok: false,
      reason: 'BUDGET',
      quietUntil: null,
    });
  });

  it('allow bersamaan ke mesin yang sama antre jeda 3 detik', async () => {
    const clock = clockAt(0);
    const pace = new DevicePace(clock);
    const first = pace.allow('dev-1', 'auto');
    const second = pace.allow('dev-1', 'auto');
    expect(clock.now()).toBe(0);
    await first;
    expect(clock.now()).toBe(0);
    await second;
    expect(clock.now()).toBe(3000);
    await pace.allow('dev-2', 'auto');
    expect(clock.now()).toBe(3000);
    for (let index = 0; index < 7; index += 1) await pace.allow('dev-1', 'auto');
    const tenth = pace.allow('dev-1', 'auto');
    const eleventh = pace.allow('dev-1', 'auto');
    await expect(eleventh).resolves.toEqual({ ok: false, reason: 'BUDGET', quietUntil: null });
    await tenth;
    expect(clock.now()).toBe(27_000);
  });

  it('preview melihat slot yang sudah direservasi saat antre menunggu', async () => {
    const clock = clockAt(0);
    const pace = new DevicePace(clock);
    for (let index = 0; index < 9; index += 1) await pace.allow('dev-1', 'auto');
    const waiting = pace.allow('dev-1', 'auto');
    await Promise.resolve();
    expect(pace.preview('dev-1', 'auto')).toEqual({ ok: false, reason: 'BUDGET', quietUntil: null });
    await waiting;
  });

  it('daftar user otomatis diblokir selama 10 menit', () => {
    const clock = clockAt(1_000);
    const pace = new DevicePace(clock);
    expect(pace.listBlocked('dev-1')).toBe(false);
    pace.noteListed('dev-1');
    clock.advance(2 * 60 * 1000);
    expect(pace.listBlocked('dev-1')).toBe(true);
    clock.advance(8 * 60 * 1000);
    expect(pace.listBlocked('dev-1')).toBe(false);
  });

  it('perintah yang selesai lebih dari 8 detik mendiamkan mesin', () => {
    const clock = clockAt(1_000);
    const pace = new DevicePace(clock);
    expect(pace.markIfSlow('dev-1', 1_000)).toBe(false);
    clock.advance(8_000);
    expect(pace.markIfSlow('dev-1', 1_000)).toBe(true);
    expect(pace.preview('dev-1', 'auto')).toMatchObject({ ok: false, reason: 'QUIET' });
    expect(pace.preview('dev-2', 'auto')).toEqual({ ok: true });
  });

  it('perintah lambat saat klik manual tidak membatalkan perintah berikutnya', async () => {
    const clock = clockAt(1_000);
    const pace = new DevicePace(clock);
    pace.armManual('dev-1');
    clock.advance(8_000);
    expect(pace.markIfSlow('dev-1', 1_000)).toBe(true);
    await expect(pace.allow('dev-1', 'manual')).resolves.toEqual({ ok: true });
    pace.finishManualClick();
    expect(pace.preview('dev-1', 'auto')).toMatchObject({ ok: false, reason: 'QUIET' });
    expect(pace.preview('dev-1', 'manual')).toEqual({ ok: true });
  });
});
