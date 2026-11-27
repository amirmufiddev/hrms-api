import {
  countUnpaidDailyAttendanceDays,
  isAttendanceDateSettled,
} from './daily-payroll.helpers';

describe('daily-payroll.helpers', () => {
  it('treats attendance inside a settled run period as already paid', () => {
    expect(
      isAttendanceDateSettled('2026-10-05', [
        { periodStart: new Date('2026-10-01'), periodEnd: new Date('2026-10-07') },
      ]),
    ).toBe(true);
    expect(
      isAttendanceDateSettled('2026-10-08', [
        { periodStart: new Date('2026-10-01'), periodEnd: new Date('2026-10-07') },
      ]),
    ).toBe(false);
  });

  it('counts only days outside settled periods', () => {
    const records = [
      { date: new Date('2026-10-05'), status: 'PRESENT' },
      { date: new Date('2026-10-08'), status: 'PRESENT' },
      { date: new Date('2026-10-09'), status: 'HALF_DAY' },
    ];
    const settled = [
      { periodStart: new Date('2026-10-01'), periodEnd: new Date('2026-10-07') },
    ];
    expect(countUnpaidDailyAttendanceDays(records, settled)).toBe(1.5);
  });
});
