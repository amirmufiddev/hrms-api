import { SalaryPayBasis, PayrollRunKind } from '@prisma/client';

describe('daily worker payroll schema', () => {
  it('exposes pay basis and run kind enums', () => {
    expect(SalaryPayBasis.MONTH).toBe('MONTH');
    expect(SalaryPayBasis.WEEK).toBe('WEEK');
    expect(SalaryPayBasis.DAILY).toBe('DAILY');
    expect(SalaryPayBasis.HOUR).toBe('HOUR');
    expect(PayrollRunKind.MONTHLY).toBe('MONTHLY');
    expect(PayrollRunKind.DAILY).toBe('DAILY');
  });
});
