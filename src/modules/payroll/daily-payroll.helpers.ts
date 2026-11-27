export type SettledDailyPeriod = {
  periodStart: Date;
  periodEnd: Date;
};

export function toDateKey(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export function isDateKeyInInclusiveRange(
  dateKey: string,
  startKey: string,
  endKey: string,
): boolean {
  return dateKey >= startKey && dateKey <= endKey;
}

export function isAttendanceDateSettled(
  attendanceDate: Date | string,
  settledPeriods: SettledDailyPeriod[],
): boolean {
  const key = toDateKey(attendanceDate);
  return settledPeriods.some((period) =>
    isDateKeyInInclusiveRange(
      key,
      toDateKey(period.periodStart),
      toDateKey(period.periodEnd),
    ),
  );
}

export function countAttendanceDayUnits(records: { status: string }[]): number {
  return records.reduce((sum, record) => {
    if (record.status === 'PRESENT' || record.status === 'WFH') return sum + 1;
    if (record.status === 'HALF_DAY') return sum + 0.5;
    return sum;
  }, 0);
}

/** Count payable days excluding dates already covered by settled daily payroll runs. */
export function countUnpaidDailyAttendanceDays(
  records: { date: Date; status: string }[],
  settledPeriods: SettledDailyPeriod[],
): number {
  const unpaid = records.filter(
    (record) => !isAttendanceDateSettled(record.date, settledPeriods),
  );
  return countAttendanceDayUnits(unpaid);
}
