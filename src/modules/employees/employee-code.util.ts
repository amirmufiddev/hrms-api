import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/** Kode pegawai HRMS: angka saja, diawali 9, panjang 6–10 digit (contoh: 900001). */
export const EMPLOYEE_CODE_PATTERN = /^9\d{5,9}$/;

export function assertValidEmployeeCode(code: string, fieldLabel = 'Employee code'): void {
  const trimmed = code?.trim() ?? '';
  if (!EMPLOYEE_CODE_PATTERN.test(trimmed)) {
    throw new BadRequestException(
      `${fieldLabel} must be numeric, start with 9, and be 6–10 digits long`,
    );
  }
}

export async function generateNextEmployeeCode(
  prisma: Prisma.TransactionClient | { employee: Prisma.EmployeeDelegate },
  tenantId: string,
): Promise<string> {
  const rows = await prisma.employee.findMany({
    where: {
      tenantId,
      employeeCode: { startsWith: '9' },
    },
    select: { employeeCode: true },
  });

  let max = 900_000;
  for (const row of rows) {
    if (!EMPLOYEE_CODE_PATTERN.test(row.employeeCode)) continue;
    const value = Number.parseInt(row.employeeCode, 10);
    if (!Number.isNaN(value) && value > max) {
      max = value;
    }
  }

  const next = max + 1;
  if (next > 9_999_999_999) {
    throw new BadRequestException('No available employee codes in the 9-prefix range');
  }
  return String(next);
}

export function normalizeKtpNumber(raw?: string | null): string | undefined {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits.length > 0 ? digits : undefined;
}

export function assertValidKtpNumber(ktp?: string | null): void {
  if (ktp == null || ktp === '') return;
  const digits = ktp.replace(/\D/g, '');
  if (digits.length !== 16) {
    throw new BadRequestException('Nomor KTP must be exactly 16 digits');
  }
}
