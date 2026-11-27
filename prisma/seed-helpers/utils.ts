import { randomUUID } from 'crypto';

export const SEED_START = new Date('2025-01-01T00:00:00.000Z');
export const SEED_END = new Date('2026-09-06T23:59:59.999Z');

/** Deterministic pseudo-random based on seed string (0..1) */
export function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(Math.sin(hash)) % 1;
}

export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(from);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export function isWeekday(d: Date): boolean {
  const day = d.getUTCDay();
  return day >= 1 && day <= 5;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

export function uuid(): string {
  return randomUUID();
}

export function pickOne<T>(arr: T[], seed: string): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

export function batchInsert<T>(
  items: T[],
  batchSize: number,
  insertFn: (batch: T[]) => Promise<void>,
): Promise<void> {
  return items.reduce(async (prev, _, i) => {
    await prev;
    if (i % batchSize === 0) {
      await insertFn(items.slice(i, i + batchSize));
    }
  }, Promise.resolve());
}

export type AttendanceMonthSummary = {
  presentDays: number;
  leaveDays: number;
  lopDays: number;
  otHours: number;
  workingDays: number;
  halfDays: number;
  wfhDays: number;
};

export function monthKey(employeeId: string, year: number, month: number): string {
  return `${employeeId}:${year}-${String(month).padStart(2, '0')}`;
}
