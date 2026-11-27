import { PayrollPdfService, payslipPeriodLabel } from './payroll-pdf.service';

describe('PayrollPdfService', () => {
  let service: PayrollPdfService;

  beforeEach(() => {
    service = new PayrollPdfService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('labels a daily run with a humanized date range', () => {
    const label = payslipPeriodLabel({
      kind: 'DAILY',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-07',
    });
    expect(label).toContain('2026');
    expect(label).toMatch(/1\s*[–-]\s*7/);
  });

  it('labels a monthly run with the month name', () => {
    expect(payslipPeriodLabel({ month: 10, year: 2026 })).toBe('October 2026');
  });

  it('generates a valid PDF buffer with IDR currency formatting', async () => {
    const mockPayslip = {
      id: 'ps-1',
      currency: 'IDR',
      workingDays: 22,
      presentDays: 20,
      leaveDays: 2,
      lopDays: 0,
      otHours: 5,
      basePay: 10000000,
      earnings: [{ name: 'Transport Allowance', amount: 1500000 }],
      deductions: [{ name: 'BPJS Ketenagakerjaan', amount: 200000 }],
      grossPay: 12000000,
      totalDeductions: 200000,
      netPay: 11800000,
      otPay: 500000,
      employee: {
        firstName: 'Budi',
        lastName: 'Santoso',
        employeeCode: 'EMP-001',
        email: 'budi@example.com',
        designation: 'Software Engineer',
        department: { name: 'Technology' },
      },
      payrollRun: {
        month: 8,
        year: 2026,
        status: 'COMPUTED',
      },
    };

    const pdfBuffer = await service.generatePayslipPdf(mockPayslip);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(100);
    // PDF magic bytes %PDF
    expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
  });

  it('generates a valid PDF buffer with USD currency formatting', async () => {
    const mockPayslip = {
      id: 'ps-2',
      currency: 'USD',
      workingDays: 20,
      presentDays: 20,
      leaveDays: 0,
      lopDays: 0,
      otHours: 0,
      basePay: 5000,
      earnings: [],
      deductions: [],
      grossPay: 5000,
      totalDeductions: 0,
      netPay: 5000,
      otPay: 0,
      employee: {
        firstName: 'John',
        lastName: 'Doe',
        employeeCode: 'EMP-002',
      },
      payrollRun: {
        month: 1,
        year: 2026,
        status: 'COMPUTED',
      },
    };

    const pdfBuffer = await service.generatePayslipPdf(mockPayslip);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(100);
  });
});
