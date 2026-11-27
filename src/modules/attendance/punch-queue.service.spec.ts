import { Test, TestingModule } from '@nestjs/testing';
import { PunchQueueService } from './punch-queue.service';
import { PunchIngestService } from './punch-ingest.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers';

describe('PunchQueueService', () => {
  let service: PunchQueueService;
  let prisma: any;
  let ingest: { applyQueuedJob: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    ingest = { applyQueuedJob: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PunchQueueService,
        { provide: PrismaService, useValue: prisma },
        { provide: PunchIngestService, useValue: ingest },
      ],
    }).compile();

    service = module.get(PunchQueueService);
  });

  it('mengunci pekerjaan pending lalu menandainya done', async () => {
    const job = {
      id: 'job-1',
      tenantId: 'tenant-1',
      deviceId: 'dev-1',
      nik: '012345',
      punchedAt: new Date('2026-10-16T01:00:00.000Z'),
      verifyMode: 'CARD',
      deviceState: 0,
      attempts: 0,
    };
    prisma.attendancePunchJob.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([job]);
    prisma.attendancePunchJob.updateMany.mockResolvedValue({ count: 1 });
    prisma.attendancePunchJob.update.mockResolvedValue(job);

    await service.processOnce(new Date('2026-10-18T00:00:00.000Z'));

    expect(ingest.applyQueuedJob).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-1' }));
    expect(prisma.attendancePunchJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { status: 'DONE', lastError: null },
    });
  });

  it('kegagalan pertama dan kedua kembali pending, ketiga menjadi failed', async () => {
    ingest.applyQueuedJob.mockRejectedValue(new Error('FOLD_FAILED'));
    const base = {
      id: 'job-1',
      tenantId: 'tenant-1',
      deviceId: 'dev-1',
      nik: '1',
      punchedAt: new Date(),
      verifyMode: 'CARD',
      deviceState: 0,
    };
    for (const attempts of [0, 1, 2]) {
      prisma.attendancePunchJob.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...base, attempts }]);
      prisma.attendancePunchJob.updateMany.mockResolvedValue({ count: 1 });
      await service.processOnce(new Date('2026-10-18T00:00:00.000Z'));
    }

    const statuses = prisma.attendancePunchJob.update.mock.calls.map(
      (call: [{ data: { status: string } }]) => call[0].data.status,
    );
    expect(statuses).toEqual(['PENDING', 'PENDING', 'FAILED']);
  });

  it('mengembalikan processing yang diam 5 menit dan gagal pada percobaan ketiga', async () => {
    const now = new Date('2026-10-18T00:05:00.000Z');
    prisma.attendancePunchJob.findMany
      .mockResolvedValueOnce([
        { id: 'stale', attempts: 2, updatedAt: new Date('2026-10-18T00:00:00.000Z') },
      ])
      .mockResolvedValueOnce([]);

    await service.processOnce(now);

    expect(prisma.attendancePunchJob.update).toHaveBeenCalledWith({
      where: { id: 'stale' },
      data: { attempts: 3, status: 'FAILED', lastError: 'PROCESSING_TIMEOUT' },
    });
  });

  it('menghitung pending dan hanya menampilkan yang gagal', async () => {
    prisma.attendancePunchJob.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    prisma.attendancePunchJob.findMany.mockResolvedValue([
      {
        id: 'job-9',
        nik: '012345',
        punchedAt: new Date('2026-10-16T01:00:00.000Z'),
        attempts: 3,
        lastError: 'FOLD_FAILED',
        device: { code: 'DEVICE-01' },
      },
    ]);

    await expect(service.list('tenant-1')).resolves.toEqual({
      pending: 2,
      failed: 1,
      rows: [
        {
          id: 'job-9',
          nik: '012345',
          punchedAt: new Date('2026-10-16T01:00:00.000Z'),
          deviceCode: 'DEVICE-01',
          attempts: 3,
          lastError: 'FOLD_FAILED',
        },
      ],
    });
  });

  it('mengulang baris failed milik tenant', async () => {
    prisma.attendancePunchJob.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.retry('tenant-1', 'job-9')).resolves.toEqual({ id: 'job-9', status: 'PENDING' });
    expect(prisma.attendancePunchJob.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-9', tenantId: 'tenant-1', status: 'FAILED' },
      data: { status: 'PENDING', attempts: 0, lastError: null },
    });
  });
});
