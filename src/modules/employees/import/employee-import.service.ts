import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { jakartaJoinDate } from './employee-import-parser';
import { importRowToCells, type ParsedEmployeeRow } from './employee-import.types';
import { nextEmployeeCode } from './nik-sequence';

function uniqueViolationMessage(err: unknown): string | null {
  if (typeof err !== 'object' || err === null || (err as { code?: string }).code !== 'P2002') {
    return null;
  }
  const target = (err as { meta?: { target?: unknown } }).meta?.target;
  const text = Array.isArray(target) ? target.map(String).join(',') : String(target ?? '');
  if (text.includes('ktpNumber')) return 'NIK KTP sudah dipakai';
  if (text.includes('bankNameKey') || text.includes('accountNumber')) {
    return 'Nomor rekening sudah dipakai';
  }
  return null;
}

@Injectable()
export class EmployeeImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importRows(
    tenantId: string,
    prefix: string,
    rows: ParsedEmployeeRow[],
    existingEmails: Set<string>,
  ): Promise<{
    created: number;
    failed: number;
    errors: { row: number; message: string; cells?: string[] }[];
  }> {
    const stored = await this.prisma.employee.findMany({
      where: {
        tenantId,
        employeeCode: { startsWith: prefix },
      },
      select: { employeeCode: true },
    });
    const existingCodes = stored.map((e) => e.employeeCode);

    let created = 0;
    let failed = 0;
    const errors: { row: number; message: string; cells?: string[] }[] = [];

    for (const row of rows) {
      const cells = importRowToCells(row);
      if (row.email) {
        if (existingEmails.has(row.email)) {
          failed++;
          errors.push({ row: row.row, message: 'Email sudah dipakai', cells });
          continue;
        }
        const duplicate = await this.prisma.employee.findFirst({
          where: { tenantId, email: row.email },
        });
        if (duplicate) {
          failed++;
          errors.push({ row: row.row, message: 'Email sudah dipakai', cells });
          continue;
        }
      }

      const duplicateKtp = await this.prisma.employee.findFirst({
        where: { tenantId, ktpNumber: row.ktpNumber },
        select: { id: true },
      });
      if (duplicateKtp) {
        failed++;
        errors.push({ row: row.row, message: 'NIK KTP sudah dipakai', cells });
        continue;
      }

      const duplicateBank = await this.prisma.employeeBankAccount.findFirst({
        where: {
          tenantId,
          accountNumber: row.accountNumber,
          bankNameKey: row.bankNameKey,
        },
        select: { id: true },
      });
      if (duplicateBank) {
        failed++;
        errors.push({ row: row.row, message: 'Nomor rekening sudah dipakai', cells });
        continue;
      }

      let employeeCode: string;
      try {
        employeeCode = nextEmployeeCode(prefix, existingCodes);
      } catch (err) {
        failed++;
        errors.push({
          row: row.row,
          message: err instanceof Error ? err.message : String(err),
          cells,
        });
        continue;
      }

      const joinDate = row.joinDate
        ? new Date(`${row.joinDate}T00:00:00.000Z`)
        : jakartaJoinDate();

      try {
        await this.prisma.$transaction(async (tx) => {
          const employee = await tx.employee.create({
            data: {
              tenantId,
              employeeCode,
              firstName: row.firstName,
              lastName: row.lastName,
              email: row.email,
              phone: row.phone,
              gender: row.gender,
              ktpNumber: row.ktpNumber,
              departmentId: row.departmentId,
              designationId: row.designationId,
              employmentType: row.employmentType,
              joinDate,
              status: 'ACTIVE',
              ssoUserId: null,
            },
          });
          await tx.employeeBankAccount.create({
            data: {
              tenantId,
              employeeId: employee.id,
              accountNumber: row.accountNumber,
              bankName: row.bankName,
              bankNameKey: row.bankNameKey,
              isPrimary: true,
            },
          });
        });
        existingCodes.push(employeeCode);
        created++;
      } catch (err) {
        failed++;
        const unique = uniqueViolationMessage(err);
        errors.push({
          row: row.row,
          message: unique ?? (err instanceof Error ? err.message : String(err)),
          cells,
        });
      }
    }

    return { created, failed, errors };
  }
}
