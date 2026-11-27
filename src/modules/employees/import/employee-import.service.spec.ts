import type { ParsedEmployeeRow } from './employee-import.types';
import { EmployeeImportService } from './employee-import.service';

function rowOf(overrides: Partial<ParsedEmployeeRow> = {}): ParsedEmployeeRow {
  return {
    row: 2,
    firstName: 'Amir',
    lastName: 'Mufid',
    ktpNumber: '3201010101010001',
    gender: 'male',
    departmentId: 'dept-1',
    departmentLabel: 'Engineering',
    designationId: 'desig-1',
    designationLabel: 'Staff',
    employmentType: 'PERMANENT',
    email: null,
    phone: '0812',
    accountNumber: '1234567890',
    bankName: 'BCA',
    bankNameKey: 'bca',
    joinDate: null,
    ...overrides,
  };
}

describe('EmployeeImportService.importRows', () => {
  const prisma = {
    employee: {
      findMany: jest.fn().mockResolvedValue([{ employeeCode: '900042' }]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'emp-1' }),
    },
    employeeBankAccount: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'bank-1' }),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.employee.findMany.mockResolvedValue([{ employeeCode: '900042' }]);
    prisma.employee.findFirst.mockResolvedValue(null);
    prisma.employee.create.mockResolvedValue({ id: 'emp-1' });
    prisma.employeeBankAccount.findFirst.mockResolvedValue(null);
    prisma.employeeBankAccount.create.mockResolvedValue({ id: 'bank-1' });
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<void>) =>
      fn(prisma),
    );
  });

  it('creates the next code and stores a null email', async () => {
    const service = new EmployeeImportService(prisma as never);
    const result = await service.importRows(
      'tenant-1',
      '90',
      [
        {
          row: 2,
          firstName: 'Amir',
          lastName: 'Mufid',
          ktpNumber: '3201010101010001',
          gender: null,
          departmentId: 'dept-1',
          departmentLabel: 'Engineering',
          designationId: 'desig-1',
          designationLabel: 'Staff',
          employmentType: 'PERMANENT',
          email: null,
          phone: null,
          accountNumber: '1234567890',
          bankName: 'BCA',
          bankNameKey: 'bca',
          joinDate: null,
        },
      ],
      new Set(),
    );

    expect(result.created).toBe(1);
    expect(prisma.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          employeeCode: '900043',
          email: null,
          ssoUserId: null,
          departmentId: 'dept-1',
          designationId: 'desig-1',
          employmentType: 'PERMANENT',
          status: 'ACTIVE',
        }),
      }),
    );
  });

  it('records a row failure when the email already exists and continues', async () => {
    prisma.employee.findFirst.mockImplementation(async (args: { where: { email?: string; ktpNumber?: string } }) => {
      if (args.where.email === 'amir@example.com') return { id: 'existing' };
      return null;
    });
    const service = new EmployeeImportService(prisma as never);
    const result = await service.importRows(
      'tenant-1',
      '90',
      [
        {
          row: 2,
          firstName: 'Amir',
          lastName: 'Mufid',
          ktpNumber: '3201010101010001',
          gender: null,
          departmentId: 'dept-1',
          departmentLabel: 'Engineering',
          designationId: 'desig-1',
          designationLabel: 'Staff',
          employmentType: 'PERMANENT',
          email: 'amir@example.com',
          phone: null,
          accountNumber: '1234567890',
          bankName: 'BCA',
          bankNameKey: 'bca',
          joinDate: '2026-01-15',
        },
        {
          row: 3,
          firstName: 'Sari',
          lastName: 'Putri',
          ktpNumber: '3201010101010002',
          gender: null,
          departmentId: 'dept-1',
          departmentLabel: 'Engineering',
          designationId: 'desig-1',
          designationLabel: 'Staff',
          employmentType: 'INTERN',
          email: null,
          phone: null,
          accountNumber: '222',
          bankName: 'BNI',
          bankNameKey: 'bni',
          joinDate: null,
        },
      ],
      new Set(['amir@example.com']),
    );

    expect(result.failed).toBe(1);
    expect(result.created).toBe(1);
    expect(result.errors[0].message).toBe('Email sudah dipakai');
  });

  it('creates the employee and one primary bank account in a transaction', async () => {
    const service = new EmployeeImportService(prisma as never);
    const result = await service.importRows(
      'tenant-1',
      '90',
      [
        {
          row: 2,
          firstName: 'Amir',
          lastName: 'Mufid',
          ktpNumber: '3201010101010001',
          gender: 'male',
          departmentId: 'dept-1',
          departmentLabel: 'Engineering',
          designationId: 'desig-1',
          designationLabel: 'Staff',
          employmentType: 'PERMANENT',
          email: null,
          phone: '0812',
          accountNumber: '1234567890',
          bankName: 'BCA',
          bankNameKey: 'bca',
          joinDate: null,
        },
      ],
      new Set(),
    );

    expect(result.created).toBe(1);
    expect(prisma.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeCode: '900043',
          ktpNumber: '3201010101010001',
          gender: 'male',
          phone: '0812',
          email: null,
          ssoUserId: null,
        }),
      }),
    );
    expect(prisma.employeeBankAccount.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        employeeId: 'emp-1',
        accountNumber: '1234567890',
        bankName: 'BCA',
        bankNameKey: 'bca',
        isPrimary: true,
      },
    });
  });

  it('fails the row when the KTP or bank account already exists and creates nothing', async () => {
    prisma.employee.findFirst.mockImplementation(async (args: { where: { ktpNumber?: string } }) => {
      if (args.where.ktpNumber === '3201010101010001') return { id: 'existing' };
      return null;
    });
    const service = new EmployeeImportService(prisma as never);
    const ktpResult = await service.importRows('tenant-1', '90', [rowOf({ ktpNumber: '3201010101010001' })], new Set());
    expect(ktpResult).toEqual(
      expect.objectContaining({ created: 0, failed: 1, errors: [expect.objectContaining({ message: 'NIK KTP sudah dipakai' })] }),
    );
    expect(prisma.employee.create).not.toHaveBeenCalled();

    prisma.employee.findFirst.mockResolvedValue(null);
    prisma.employeeBankAccount.findFirst.mockResolvedValueOnce({ id: 'bank-existing' });
    const bankResult = await service.importRows('tenant-1', '90', [rowOf({ ktpNumber: '3201010101010009' })], new Set());
    expect(bankResult.errors[0].message).toBe('Nomor rekening sudah dipakai');
    expect(prisma.employee.create).not.toHaveBeenCalled();
  });

  it('does not advance the employee code when the bank insert fails', async () => {
    prisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['tenantId', 'bankNameKey', 'accountNumber'] } }),
    );
    const service = new EmployeeImportService(prisma as never);
    const result = await service.importRows(
      'tenant-1',
      '90',
      [rowOf({ row: 2 }), rowOf({ row: 3, ktpNumber: '3201010101010008', accountNumber: '888', bankName: 'BNI', bankNameKey: 'bni' })],
      new Set(),
    );
    expect(result.failed).toBe(1);
    expect(result.created).toBe(1);
    expect(result.errors[0].message).toBe('Nomor rekening sudah dipakai');
    expect(prisma.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ employeeCode: '900043' }) }),
    );
  });

  it('maps a KTP unique violation from the database', async () => {
    prisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error('unique'), {
        code: 'P2002',
        meta: { target: ['tenantId', 'ktpNumber'] },
      }),
    );
    const service = new EmployeeImportService(prisma as never);
    const result = await service.importRows('tenant-1', '90', [rowOf()], new Set());
    expect(result.created).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0].message).toBe('NIK KTP sudah dipakai');
  });
});
