import { Test, TestingModule } from '@nestjs/testing';
import { AccrualTriggerType } from '@prisma/client';
import { LeaveAccrualCronService } from './leave-accrual-cron.service';
import { LeaveAccrualService } from './leave-accrual.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers';

describe('LeaveAccrualCronService', () => {
  let service: LeaveAccrualCronService;
  let prisma: any;
  let accrual: { triggerAccrual: jest.Mock };

  beforeEach(async () => {
    accrual = { triggerAccrual: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveAccrualCronService,
        { provide: LeaveAccrualService, useValue: accrual },
        { provide: PrismaService, useValue: createMockPrismaService() },
      ],
    }).compile();

    service = module.get(LeaveAccrualCronService);
    prisma = module.get(PrismaService);
  });

  it('memicu accrual CRON_JOB untuk setiap tenant aktif', async () => {
    prisma.tenant.findMany.mockResolvedValue([
      { id: 't1', name: 'Tenant One' },
      { id: 't2', name: 'Tenant Two' },
    ]);
    accrual.triggerAccrual.mockResolvedValue({ processedCount: 3, failedCount: 0 });

    await service.handleMonthlyAccrual();

    const now = new Date();
    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    expect(accrual.triggerAccrual).toHaveBeenCalledTimes(2);
    expect(accrual.triggerAccrual).toHaveBeenNthCalledWith(
      1,
      't1',
      { month: now.getMonth() + 1, year: now.getFullYear() },
      AccrualTriggerType.CRON_JOB,
    );
    expect(accrual.triggerAccrual).toHaveBeenNthCalledWith(
      2,
      't2',
      { month: now.getMonth() + 1, year: now.getFullYear() },
      AccrualTriggerType.CRON_JOB,
    );
  });

  it('lanjut ke tenant berikutnya bila satu tenant gagal', async () => {
    prisma.tenant.findMany.mockResolvedValue([
      { id: 't1', name: 'Tenant One' },
      { id: 't2', name: 'Tenant Two' },
    ]);
    accrual.triggerAccrual
      .mockRejectedValueOnce(new Error('already completed'))
      .mockResolvedValueOnce({ processedCount: 1, failedCount: 0 });

    await service.handleMonthlyAccrual();

    expect(accrual.triggerAccrual).toHaveBeenCalledTimes(2);
  });
});
