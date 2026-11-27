export type PunchDirection = 'IN' | 'OUT';

export interface ShiftWindow {
  startTime: string;
  endTime: string;
  graceMinutes: number;
}

export interface PunchForFold {
  punchedAt: Date;
  deviceState: number | null;
}

export interface FoldedSession {
  inTime: Date;
  outTime: Date | null;
  sessionMinutes: number;
  missingOut: boolean;
}

export interface DaySummary {
  clockInTime: Date | null;
  clockOutTime: Date | null;
  workedMinutes: number;
}

const JAKARTA = 'Asia/Jakarta';

/** Tap lebih dekat dari ini diabaikan. Sama dengan Re verify mesin, 60 detik. */
export const MIN_PUNCH_GAP_MS = 60_000;

export function punchesForAttendance<T extends PunchForFold>(punches: T[]): T[] {
  const ordered = [...punches].sort(
    (a, b) => a.punchedAt.getTime() - b.punchedAt.getTime(),
  );
  const kept: T[] = [];
  for (const punch of ordered) {
    const previous = kept[kept.length - 1];
    if (
      previous &&
      punch.punchedAt.getTime() - previous.punchedAt.getTime() < MIN_PUNCH_GAP_MS
    ) {
      continue;
    }
    kept.push(punch);
  }
  return kept;
}

export function mapDeviceState(
  state: number | null,
  hasOpenSession: boolean,
): PunchDirection {
  if (state === 0 || state === 3 || state === 4) {
    return 'IN';
  }
  if (state === 1 || state === 2 || state === 5) {
    return 'OUT';
  }
  return hasOpenSession ? 'OUT' : 'IN';
}

export function attendanceDateKey(punchedAt: Date, shift: ShiftWindow | null): string {
  const parts = jakartaParts(punchedAt);
  const today = dateKey(parts.year, parts.month, parts.day);
  if (!shift) {
    return today;
  }

  const start = hhmmToMinutes(shift.startTime);
  const end = hhmmToMinutes(shift.endTime);
  if (end >= start) {
    return today;
  }

  const minuteOfDay = parts.hour * 60 + parts.minute;
  const cutoff = end + shift.graceMinutes;
  if (minuteOfDay <= cutoff) {
    return addDays(today, -1);
  }
  return today;
}

export function buildSessions(punches: PunchForFold[]): FoldedSession[] {
  const kept = punchesForAttendance(punches);
  const sessions: FoldedSession[] = [];

  kept.forEach((punch, index) => {
    const direction: PunchDirection = index % 2 === 0 ? 'IN' : 'OUT';
    const current = sessions.find((session) => session.outTime === null);

    if (direction === 'IN') {
      sessions.push({
        inTime: punch.punchedAt,
        outTime: null,
        sessionMinutes: 0,
        missingOut: false,
      });
      return;
    }

    if (current) {
      current.outTime = punch.punchedAt;
      current.sessionMinutes = minutesBetween(current.inTime, punch.punchedAt);
      current.missingOut = false;
    }
  });

  return sessions;
}

export function summarizeDay(sessions: FoldedSession[]): DaySummary {
  if (sessions.length === 0) {
    return { clockInTime: null, clockOutTime: null, workedMinutes: 0 };
  }

  const last = sessions[sessions.length - 1];
  const workedMinutes = sessions.reduce(
    (sum, session) => sum + (session.outTime ? session.sessionMinutes : 0),
    0,
  );

  return {
    clockInTime: sessions[0].inTime,
    clockOutTime: last.outTime,
    workedMinutes,
  };
}

function jakartaParts(instant: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JAKARTA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  let hour = read('hour');
  if (hour === 24) {
    hour = 0;
  }
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour,
    minute: read('minute'),
  };
}

function dateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return dateKey(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

function hhmmToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
}
