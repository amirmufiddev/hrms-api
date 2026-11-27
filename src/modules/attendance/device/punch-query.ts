import { BadRequestException } from '@nestjs/common';
import { jakartaDayWindow } from './jakarta-day';

export type PunchQuery =
  | { kind: 'day'; start: Date; end: Date }
  | { kind: 'recent'; limit: number };

export function parsePunchQuery(input: { date?: string; recent?: string }): PunchQuery {
  const date = input.date?.trim() ?? '';
  const recent = input.recent?.trim() ?? '';
  if ((date.length > 0) === (recent.length > 0)) {
    throw new BadRequestException('PUNCH_QUERY_INVALID');
  }
  if (date.length > 0) {
    const window = jakartaDayWindow(date);
    if (!window) {
      throw new BadRequestException('PUNCH_DATE_INVALID');
    }
    return { kind: 'day', start: window.start, end: window.end };
  }
  const limit = Number(recent);
  if (!Number.isInteger(limit) || limit < 1 || limit > 8) {
    throw new BadRequestException('PUNCH_RECENT_INVALID');
  }
  return { kind: 'recent', limit };
}
