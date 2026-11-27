import { ConflictException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { EmployeeImportController } from './employee-import.controller';
import { overrideJwtAuthGuard } from '../../../test/helpers';

describe('EmployeeImportController', () => {
  const queue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    getJobs: jest.fn().mockResolvedValue([]),
    getJob: jest.fn(),
  };

  it('returns the job id without importing rows', async () => {
    const module = await overrideJwtAuthGuard(
      Test.createTestingModule({
        controllers: [EmployeeImportController],
        providers: [{ provide: getQueueToken('employee-import'), useValue: queue }],
      }),
    ).compile();
    const controller = module.get(EmployeeImportController);

    await expect(
      controller.enqueue(
        { tenantId: 'tenant-1' } as never,
        { nikPrefix: '90' },
        {
          buffer: Buffer.from('xlsx'),
          originalname: 'karyawan.xlsx',
          size: 4,
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        } as never,
      ),
    ).resolves.toEqual({ jobId: 'job-1' });
    expect(queue.add).toHaveBeenCalledWith(
      'import',
      expect.objectContaining({ tenantId: 'tenant-1', nikPrefix: '90' }),
    );
  });

  it('rejects a second active import for the same tenant', async () => {
    queue.getJobs.mockResolvedValueOnce([
      { id: 'job-9', data: { tenantId: 'tenant-1' }, getState: async () => 'active' },
    ]);
    const module = await overrideJwtAuthGuard(
      Test.createTestingModule({
        controllers: [EmployeeImportController],
        providers: [{ provide: getQueueToken('employee-import'), useValue: queue }],
      }),
    ).compile();
    const controller = module.get(EmployeeImportController);

    await expect(
      controller.enqueue({ tenantId: 'tenant-1' } as never, { nikPrefix: '90' }, {
        buffer: Buffer.from('xlsx'),
        originalname: 'karyawan.xlsx',
        size: 4,
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the failure reason for a failed job', async () => {
    queue.getJob.mockResolvedValueOnce({
      id: 'job-1',
      data: { tenantId: 'tenant-1' },
      failedReason: 'Header sheet Data tidak sesuai template',
      progress: 0,
      getState: async () => 'failed',
    });
    const module = await overrideJwtAuthGuard(
      Test.createTestingModule({
        controllers: [EmployeeImportController],
        providers: [{ provide: getQueueToken('employee-import'), useValue: queue }],
      }),
    ).compile();
    const controller = module.get(EmployeeImportController);

    await expect(
      controller.getJobStatus({ tenantId: 'tenant-1' } as never, 'job-1'),
    ).resolves.toEqual({
      jobId: 'job-1',
      state: 'failed',
      progress: { total: 0, processed: 0, created: 0, failed: 0, errors: [] },
      failedReason: 'Header sheet Data tidak sesuai template',
    });
  });
});
