import { Injectable, NotFoundException } from '@nestjs/common';
import { PunchJobStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PunchIngestService } from './punch-ingest.service';

const STALE_MS = 5 * 60 * 1000;
const BATCH = 50;

@Injectable()
export class PunchQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingest: PunchIngestService,
  ) {}

  async processOnce(now = new Date()): Promise<void> {
    const staleBefore = new Date(now.getTime() - STALE_MS);
    const stale = await this.prisma.attendancePunchJob.findMany({
      where: { status: PunchJobStatus.PROCESSING, updatedAt: { lt: staleBefore } },
    });
    for (const job of stale) {
      const attempts = job.attempts + 1;
      await this.prisma.attendancePunchJob.update({
        where: { id: job.id },
        data: {
          attempts,
          status: attempts >= 3 ? PunchJobStatus.FAILED : PunchJobStatus.PENDING,
          lastError: 'PROCESSING_TIMEOUT',
        },
      });
    }

    const pending = await this.prisma.attendancePunchJob.findMany({
      where: { status: PunchJobStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: BATCH,
    });

    for (const job of pending) {
      const locked = await this.prisma.attendancePunchJob.updateMany({
        where: { id: job.id, status: PunchJobStatus.PENDING },
        data: { status: PunchJobStatus.PROCESSING },
      });
      if (locked.count !== 1) continue;

      try {
        await this.ingest.applyQueuedJob({
          id: job.id,
          tenantId: job.tenantId,
          deviceId: job.deviceId,
          nik: job.nik,
          punchedAt: job.punchedAt,
          verifyMode: job.verifyMode,
          deviceState: job.deviceState,
        });
        await this.prisma.attendancePunchJob.update({
          where: { id: job.id },
          data: { status: PunchJobStatus.DONE, lastError: null },
        });
      } catch (error) {
        const attempts = job.attempts + 1;
        const message = error instanceof Error ? error.message : 'PROCESS_FAILED';
        await this.prisma.attendancePunchJob.update({
          where: { id: job.id },
          data: {
            attempts,
            lastError: message,
            status: attempts >= 3 ? PunchJobStatus.FAILED : PunchJobStatus.PENDING,
          },
        });
      }
    }
  }

  async list(tenantId: string) {
    const [pending, failed] = await Promise.all([
      this.prisma.attendancePunchJob.count({
        where: { tenantId, status: PunchJobStatus.PENDING },
      }),
      this.prisma.attendancePunchJob.count({
        where: { tenantId, status: PunchJobStatus.FAILED },
      }),
    ]);
    const rows = await this.prisma.attendancePunchJob.findMany({
      where: { tenantId, status: PunchJobStatus.FAILED },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: { device: { select: { code: true } } },
    });
    return {
      pending,
      failed,
      rows: rows.map((row) => ({
        id: row.id,
        nik: row.nik,
        punchedAt: row.punchedAt,
        deviceCode: row.device.code,
        attempts: row.attempts,
        lastError: row.lastError,
      })),
    };
  }

  async retry(tenantId: string, id: string) {
    const updated = await this.prisma.attendancePunchJob.updateMany({
      where: { id, tenantId, status: PunchJobStatus.FAILED },
      data: { status: PunchJobStatus.PENDING, attempts: 0, lastError: null },
    });
    if (updated.count === 0) {
      throw new NotFoundException('PUNCH_JOB_NOT_FOUND');
    }
    return { id, status: 'PENDING' as const };
  }
}
