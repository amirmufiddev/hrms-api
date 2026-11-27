import { Test, TestingModule } from '@nestjs/testing';
import { AccrualTriggerType, UserRole } from '@prisma/client';
import { overrideJwtAuthGuard } from '../../test/helpers';
import { LeaveAccrualController } from './leave-accrual.controller';
import { LeaveAccrualService } from './leave-accrual.service';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';

const mockAccrualService = {
  createAccrualRule: jest.fn(),
  getAccrualRules: jest.fn(),
  getAccrualRuleById: jest.fn(),
  updateAccrualRule: jest.fn(),
  deleteAccrualRule: jest.fn(),
  triggerAccrual: jest.fn(),
  getAccrualRuns: jest.fn(),
  getAccrualRunById: jest.fn(),
  getAccrualRunEntries: jest.fn(),
};

describe('LeaveAccrualController', () => {
  let controller: LeaveAccrualController;
  let service: typeof mockAccrualService;

  const adminUser: AuthenticatedUser = {
    userId: 'user-1',
    email: 'admin@test.com',
    tenantId: 'tenant-1',
    role: UserRole.HR_ADMIN,
    employeeId: 'emp-1',
  };

  beforeEach(async () => {
    Object.values(mockAccrualService).forEach((fn) => fn.mockReset());

    const module: TestingModule = await overrideJwtAuthGuard(
      Test.createTestingModule({
        controllers: [LeaveAccrualController],
        providers: [{ provide: LeaveAccrualService, useValue: mockAccrualService }],
      }),
    ).compile();

    controller = module.get(LeaveAccrualController);
    service = module.get(LeaveAccrualService);
  });

  it('mewajibkan leave:manage di seluruh controller', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, LeaveAccrualController)).toEqual(['leave:manage']);
  });

  it('meneruskan pembuatan aturan ke service', async () => {
    const dto = { leaveTypeId: 'lt-1', monthlyAccrualDays: 1.5 };
    service.createAccrualRule.mockResolvedValue({ id: 'rule-1' });

    await controller.createRule(adminUser, dto);

    expect(service.createAccrualRule).toHaveBeenCalledWith('tenant-1', dto);
  });

  it('memicu accrual manual dengan user pemicu', async () => {
    const dto = { month: 10, year: 2026 };
    service.triggerAccrual.mockResolvedValue({ accrualRunId: 'run-1' });

    await controller.triggerAccrual(adminUser, dto);

    expect(service.triggerAccrual).toHaveBeenCalledWith(
      'tenant-1',
      dto,
      AccrualTriggerType.MANUAL_ADMIN,
      'user-1',
    );
  });

  it('meneruskan daftar run dan entri ke service', async () => {
    service.getAccrualRuns.mockResolvedValue({ data: [] });
    service.getAccrualRunEntries.mockResolvedValue({ entries: [] });

    await controller.getRuns(adminUser, { year: 2026 });
    await controller.getRunEntries(adminUser, 'run-1', 1, 50);

    expect(service.getAccrualRuns).toHaveBeenCalledWith('tenant-1', { year: 2026 });
    expect(service.getAccrualRunEntries).toHaveBeenCalledWith('tenant-1', 'run-1', 1, 50);
  });
});
