import { Test, TestingModule } from '@nestjs/testing';
import { overrideJwtAuthGuard } from '../../test/helpers';
import { BadRequestException } from '@nestjs/common';
import { CompOffController } from './comp-off.controller';
import { CompOffService } from './comp-off.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

const mockCompOffService = {
  create: jest.fn(),
  getMyRequests: jest.fn(),
  getPendingApprovals: jest.fn(),
  getAllRequests: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
};

describe('CompOffController', () => {
  let controller: CompOffController;
  let service: typeof mockCompOffService;

  const adminUser: AuthenticatedUser = {
    userId: 'user-1',
    email: 'admin@test.com',
    tenantId: 'tenant-1',
    role: UserRole.HR_ADMIN,
    employeeId: 'emp-1',
  };

  const managerUser: AuthenticatedUser = {
    userId: 'user-2',
    email: 'manager@test.com',
    tenantId: 'tenant-1',
    role: UserRole.MANAGER,
    employeeId: 'emp-mgr',
  };

  const employeeUser: AuthenticatedUser = {
    userId: 'user-3',
    email: 'employee@test.com',
    tenantId: 'tenant-1',
    role: UserRole.EMPLOYEE,
    employeeId: 'emp-3',
  };

  const userWithoutEmployee: AuthenticatedUser = {
    userId: 'user-4',
    email: 'noemp@test.com',
    tenantId: 'tenant-1',
    role: UserRole.EMPLOYEE,
    employeeId: undefined,
  };

  beforeEach(async () => {
    Object.values(mockCompOffService).forEach((fn) => fn.mockReset());

    const module: TestingModule = await overrideJwtAuthGuard(
      Test.createTestingModule({
        controllers: [CompOffController],
        providers: [{ provide: CompOffService, useValue: mockCompOffService }],
      }),
    ).compile();

    controller = module.get<CompOffController>(CompOffController);
    service = module.get(CompOffService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      workedDate: '2026-09-05',
      reason: 'Weekend deployment',
      earnedDays: 1,
    };

    it('should call service.create with tenantId, employeeId, and dto', async () => {
      const mockResult = { id: 'co-1', status: 'PENDING' };
      service.create.mockResolvedValue(mockResult);

      const result = await controller.create(employeeUser, dto as any);

      expect(service.create).toHaveBeenCalledWith(
        'tenant-1',
        'emp-3',
        dto,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException if user has no employeeId', async () => {
      await expect(
        controller.create(userWithoutEmployee, dto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyRequests', () => {
    it('should call service.getMyRequests with tenantId, employeeId, and query', async () => {
      const query = { status: 'PENDING' };
      const mockResult = { data: [], meta: { total: 0 } };
      service.getMyRequests.mockResolvedValue(mockResult);

      const result = await controller.getMyRequests(employeeUser, query as any);

      expect(service.getMyRequests).toHaveBeenCalledWith(
        'tenant-1',
        'emp-3',
        query,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException if user has no employeeId', async () => {
      await expect(
        controller.getMyRequests(userWithoutEmployee, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingApprovals', () => {
    it('should call service.getPendingApprovals with tenantId, employeeId, and role', async () => {
      const mockResult = [{ id: 'co-1', status: 'PENDING' }];
      service.getPendingApprovals.mockResolvedValue(mockResult);

      const result = await controller.getPendingApprovals(managerUser);

      expect(service.getPendingApprovals).toHaveBeenCalledWith(
        'tenant-1',
        'emp-mgr',
        UserRole.MANAGER,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException if user has no employeeId', async () => {
      await expect(
        controller.getPendingApprovals(userWithoutEmployee),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllRequests', () => {
    it('should call service.getAllRequests with tenantId and query', async () => {
      const query = { status: 'PENDING', page: 1, limit: 10 };
      const mockResult = { data: [], meta: { total: 0 } };
      service.getAllRequests.mockResolvedValue(mockResult);

      const result = await controller.getAllRequests(adminUser, query as any);

      expect(service.getAllRequests).toHaveBeenCalledWith('tenant-1', query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('approve', () => {
    const dto = { approverNote: 'Approved' };

    it('should call service.approve with tenantId, id, employeeId, role, and dto', async () => {
      const mockResult = { id: 'co-1', status: 'APPROVED' };
      service.approve.mockResolvedValue(mockResult);

      const result = await controller.approve(
        managerUser,
        'co-1',
        dto as any,
      );

      expect(service.approve).toHaveBeenCalledWith(
        'tenant-1',
        'co-1',
        'emp-mgr',
        UserRole.MANAGER,
        dto,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException if user has no employeeId', async () => {
      await expect(
        controller.approve(userWithoutEmployee, 'co-1', dto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    const dto = { approverNote: 'Rejected' };

    it('should call service.reject with tenantId, id, employeeId, role, and dto', async () => {
      const mockResult = { id: 'co-1', status: 'REJECTED' };
      service.reject.mockResolvedValue(mockResult);

      const result = await controller.reject(
        managerUser,
        'co-1',
        dto as any,
      );

      expect(service.reject).toHaveBeenCalledWith(
        'tenant-1',
        'co-1',
        'emp-mgr',
        UserRole.MANAGER,
        dto,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException if user has no employeeId', async () => {
      await expect(
        controller.reject(userWithoutEmployee, 'co-1', dto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
