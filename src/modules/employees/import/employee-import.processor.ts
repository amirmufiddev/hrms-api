import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as ExcelJS from 'exceljs';
import { unlink } from 'fs/promises';
import { PrismaService } from '../../../prisma/prisma.service';
import { assertImportHeaders, parseEmployeeSheet } from './employee-import-parser';
import { EmployeeImportService } from './employee-import.service';
import type {
  EmployeeImportJobData,
  EmployeeImportProgress,
} from './employee-import.types';

function worksheetToRows(sheet: ExcelJS.Worksheet): unknown[][] {
  const rows: unknown[][] = [];
  sheet.eachRow((row, rowNumber) => {
    const values = row.values;
    const cells = Array.isArray(values) ? values.slice(1) : [];
    while (rows.length < rowNumber - 1) {
      rows.push([]);
    }
    rows[rowNumber - 1] = cells;
  });
  return rows;
}

@Processor('employee-import')
export class EmployeeImportProcessor extends WorkerHost {
  private readonly logger = new Logger(EmployeeImportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeImportService: EmployeeImportService,
  ) {
    super();
  }

  async process(job: Job<EmployeeImportJobData>): Promise<void> {
    const { tenantId, filePath, nikPrefix } = job.data;
    this.logger.debug(`Processing employee import job ${job.id} for tenant ${tenantId}`);

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const sheet = workbook.getWorksheet('Data');
      if (!sheet) {
        throw new Error('Sheet Data tidak ditemukan');
      }

      const rows = worksheetToRows(sheet);
      const headerRow = rows[0] ?? [];
      assertImportHeaders(headerRow);

      const [departments, designations] = await Promise.all([
        this.prisma.department.findMany({
          where: { tenantId },
          select: { id: true, name: true, code: true },
        }),
        this.prisma.designation.findMany({
          where: { tenantId },
          select: { id: true, name: true, code: true },
        }),
      ]);

      const parsed = parseEmployeeSheet(rows, departments, designations);
      const total = parsed.rows.length + parsed.errors.length;

      const afterParse: EmployeeImportProgress = {
        total,
        processed: total,
        created: 0,
        failed: parsed.errors.length,
        errors: [...parsed.errors],
      };
      await job.updateProgress(afterParse);

      const emails = parsed.rows
        .map((row) => row.email)
        .filter((email): email is string => email != null && email !== '');

      const existingRecords =
        emails.length === 0
          ? []
          : await this.prisma.employee.findMany({
              where: { tenantId, email: { in: emails } },
              select: { email: true },
            });

      const existingEmails = new Set(
        existingRecords
          .map((record) => record.email?.toLowerCase())
          .filter((email): email is string => email != null),
      );

      const importResult = await this.employeeImportService.importRows(
        tenantId,
        nikPrefix,
        parsed.rows,
        existingEmails,
      );

      const combinedErrors = [...parsed.errors, ...importResult.errors];
      const afterImport: EmployeeImportProgress = {
        total,
        processed: total,
        created: importResult.created,
        failed: parsed.errors.length + importResult.failed,
        errors: combinedErrors,
      };
      await job.updateProgress(afterImport);
    } catch (error) {
      this.logger.error(
        `Employee import job ${job.id} failed: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    } finally {
      await unlink(filePath).catch(() => undefined);
    }
  }
}
