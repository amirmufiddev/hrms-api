import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import * as ExcelJS from 'exceljs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/jwt-payload.type';
import { assertNikPrefix } from './nik-sequence';
import { buildEmployeeImportTemplate } from './employee-import-template';
import { buildFailedImportRowsWorkbook } from './employee-import-failed-export';
import {
  EmployeeImportJobData,
  IMPORT_HEADERS,
  normalizeImportProgress,
} from './employee-import.types';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_DATA_ROWS = 5000;

function isBlankDataRow(cells: string[]): boolean {
  return cells.every((c) => c === '');
}

async function countNonEmptyDataRows(buffer: Buffer): Promise<number> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(
      buffer as unknown as Awaited<
        ReturnType<InstanceType<typeof ExcelJS.Workbook>['xlsx']['writeBuffer']>
      >,
    );
  } catch {
    return 0;
  }
  const sheet = workbook.getWorksheet('Data');
  if (!sheet) {
    return 0;
  }
  let count = 0;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    const values = row.values;
    const rawRow = Array.isArray(values) ? values.slice(1) : [];
    const cells = IMPORT_HEADERS.map((_, col) => {
      const cell = rawRow[col];
      return cell == null ? '' : String(cell).trim();
    });
    if (!isBlankDataRow(cells)) {
      count++;
    }
  });
  return count;
}

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees/import')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeeImportController {
  constructor(
    @InjectQueue('employee-import') private readonly queue: Queue<EmployeeImportJobData>,
  ) {}

  @Get('template')
  @ApiOperation({ summary: 'Download employee import spreadsheet template' })
  @RequirePermissions('employees:create')
  async downloadTemplate(@Res() res: Response): Promise<void> {
    const buffer = await buildEmployeeImportTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-import-karyawan.xlsx"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post()
  @ApiOperation({ summary: 'Enqueue employee spreadsheet import' })
  @RequirePermissions('employees:create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_BYTES },
    }),
  )
  async enqueue(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { nikPrefix: string },
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ jobId: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File impor wajib diunggah');
    }

    const originalName = file.originalname ?? '';
    if (!/\.xlsx$/i.test(originalName)) {
      throw new BadRequestException('File harus berformat .xlsx');
    }

    let nikPrefix: string;
    try {
      nikPrefix = assertNikPrefix(body.nikPrefix ?? '');
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : String(err),
      );
    }

    const waitingOrActive = await this.queue.getJobs(['waiting', 'active']);
    for (const job of waitingOrActive) {
      if (job.data?.tenantId !== user.tenantId) {
        continue;
      }
      const state = await job.getState();
      const progress = normalizeImportProgress(job.progress);
      throw new ConflictException({ jobId: String(job.id), state, progress });
    }

    const dir = path.join(os.tmpdir(), 'hrms-employee-import');
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${randomUUID()}.xlsx`);
    await writeFile(filePath, file.buffer);

    const rowCount = await countNonEmptyDataRows(file.buffer);
    if (rowCount > MAX_DATA_ROWS) {
      await unlink(filePath).catch(() => undefined);
      throw new BadRequestException(
        `Maksimal ${MAX_DATA_ROWS} baris data per file impor`,
      );
    }

    const job = await this.queue.add('import', {
      tenantId: user.tenantId,
      filePath,
      nikPrefix,
    });

    return { jobId: String(job.id) };
  }

  @Get(':jobId/failed-rows')
  @ApiOperation({ summary: 'Download spreadsheet of failed import rows' })
  @RequirePermissions('employees:create')
  async downloadFailedRows(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (!job || job.data?.tenantId !== user.tenantId) {
      throw new NotFoundException('Job impor tidak ditemukan');
    }

    const progress = normalizeImportProgress(job.progress);
    if (progress.errors.length === 0) {
      throw new BadRequestException('Tidak ada baris gagal untuk diunduh');
    }

    const buffer = await buildFailedImportRowsWorkbook(progress.errors);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="import-gagal-${jobId}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Get employee import job status' })
  @RequirePermissions('employees:create')
  async getJobStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
  ): Promise<{
    jobId: string;
    state: string;
    progress: ReturnType<typeof normalizeImportProgress>;
    failedReason?: string;
  }> {
    const job = await this.queue.getJob(jobId);
    if (!job || job.data?.tenantId !== user.tenantId) {
      throw new NotFoundException('Job impor tidak ditemukan');
    }

    const state = await job.getState();
    if (!['waiting', 'active', 'completed', 'failed'].includes(state)) {
      throw new NotFoundException('Job impor tidak ditemukan');
    }

    return {
      jobId: String(job.id),
      state,
      progress: normalizeImportProgress(job.progress),
      failedReason:
        state === 'failed' ? job.failedReason || 'Impor gagal' : undefined,
    };
  }
}
