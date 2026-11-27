import { BadRequestException } from '@nestjs/common';
import { parsePunchQuery } from './punch-query';

describe('parsePunchQuery', () => {
  it('membaca satu hari Jakarta', () => {
    const query = parsePunchQuery({ date: '2026-10-16' });
    expect(query).toEqual({
      kind: 'day',
      start: new Date('2026-10-15T17:00:00.000Z'),
      end: new Date('2026-10-16T16:59:59.999Z'),
    });
  });

  it('membaca recent 8 dan menolak campuran atau kosong', () => {
    expect(parsePunchQuery({ recent: '8' })).toEqual({ kind: 'recent', limit: 8 });
    expect(() => parsePunchQuery({ date: '2026-10-16', recent: '8' })).toThrow(BadRequestException);
    expect(() => parsePunchQuery({})).toThrow(BadRequestException);
    expect(() => parsePunchQuery({ recent: '9' })).toThrow(BadRequestException);
    expect(() => parsePunchQuery({ date: '2026-02-31' })).toThrow(BadRequestException);
  });
});
