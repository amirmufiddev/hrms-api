import { DeviceLogRow } from './device-log-record';

export type DevicePushMessage = {
  cmd?: unknown;
  record?: unknown;
  sn?: unknown;
  enrollid?: unknown;
  name?: unknown;
  backupnum?: unknown;
};

export type PushedEnrollment = {
  enrollId: string;
  name: string;
  backupnum: number;
  record: string;
};

export function cloudTime(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = read('hour') === '24' ? '00' : read('hour');
  return `${read('year')}-${read('month')}-${read('day')} ${hour}:${read('minute')}:${read('second')}`;
}

export function answerDevice(
  message: DevicePushMessage,
  now: Date,
): { reply: Record<string, unknown>; logs: DeviceLogRow[]; enrollment: PushedEnrollment | null } {
  const cmd = typeof message.cmd === 'string' ? message.cmd : '';
  if (!cmd) {
    return { reply: { ret: 'unknown', result: false, reason: 1 }, logs: [], enrollment: null };
  }
  if (cmd === 'senduser') {
    const enrollment = readEnrollment(message);
    if (!enrollment) {
      return { reply: { ret: 'senduser', result: false, reason: 1 }, logs: [], enrollment: null };
    }
    return { reply: { ret: 'senduser', result: true, cloudtime: cloudTime(now) }, logs: [], enrollment };
  }
  const logs =
    cmd === 'sendlog' && Array.isArray(message.record)
      ? message.record.filter((row): row is DeviceLogRow => typeof row === 'object' && row !== null)
      : [];
  return {
    reply: { ret: cmd, result: true, cloudtime: cloudTime(now) },
    logs,
    enrollment: null,
  };
}

function readEnrollment(message: DevicePushMessage): PushedEnrollment | null {
  const enrollId = String(message.enrollid ?? '').trim().replace(/^0+/, '');
  const backupnum = Number(message.backupnum);
  if (!/^[0-9]+$/.test(enrollId) || !Number.isInteger(backupnum)) return null;
  const record = message.record === undefined || message.record === null ? '' : String(message.record).trim();
  const name = typeof message.name === 'string' ? message.name.trim() : '';
  return { enrollId, name, backupnum, record };
}
