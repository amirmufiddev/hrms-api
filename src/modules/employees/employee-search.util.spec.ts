import { buildEmployeeSearchWhere } from './employee-search.util';

describe('buildEmployeeSearchWhere', () => {
  it('matches single token on any field', () => {
    expect(buildEmployeeSearchWhere('john')).toEqual({
      OR: [
        {
          OR: [
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
            { employeeCode: { contains: 'john', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });

  it('matches multi-word names across firstName and lastName', () => {
    const where = buildEmployeeSearchWhere('ALDI DARMAWAN');
    expect(where.OR).toHaveLength(2);
    expect(where.OR?.[1]).toEqual({
      AND: [
        {
          OR: [
            { firstName: { contains: 'ALDI', mode: 'insensitive' } },
            { lastName: { contains: 'ALDI', mode: 'insensitive' } },
            { email: { contains: 'ALDI', mode: 'insensitive' } },
            { employeeCode: { contains: 'ALDI', mode: 'insensitive' } },
          ],
        },
        {
          OR: [
            { firstName: { contains: 'DARMAWAN', mode: 'insensitive' } },
            { lastName: { contains: 'DARMAWAN', mode: 'insensitive' } },
            { email: { contains: 'DARMAWAN', mode: 'insensitive' } },
            { employeeCode: { contains: 'DARMAWAN', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });
});
