import { Test, TestingModule } from '@nestjs/testing';
import { overrideJwtAuthGuard } from '../../test/helpers';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

const mockDepartmentsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  getHierarchy: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('DepartmentsController', () => {
  let controller: DepartmentsController;
  let service: typeof mockDepartmentsService;

  const adminUser: AuthenticatedUser = {
    userId: 'user-1',
    email: 'admin@test.com',
    tenantId: 'tenant-1',
    role: UserRole.HR_ADMIN,
    employeeId: 'emp-1',
  };

  beforeEach(async () => {
    Object.values(mockDepartmentsService).forEach((fn) => fn.mockReset());

    const module: TestingModule = await overrideJwtAuthGuard(
      Test.createTestingModule({
        controllers: [DepartmentsController],
        providers: [
          { provide: DepartmentsService, useValue: mockDepartmentsService },
        ],
      }),
    ).compile();

    controller = module.get<DepartmentsController>(DepartmentsController);
    service = module.get(DepartmentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate create to departmentsService.create', async () => {
      const dto = { name: 'Engineering', code: 'ENG' };
      const created = { id: 'dept-1', ...dto };
      service.create.mockResolvedValue(created);

      const result = await controller.create(adminUser, dto as any);

      expect(service.create).toHaveBeenCalledWith('tenant-1', dto);
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should call departmentsService.findAll with tenantId', async () => {
      const mockResult = [
        { id: 'dept-1', name: 'Engineering' },
        { id: 'dept-2', name: 'HR' },
      ];
      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(adminUser);

      expect(service.findAll).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('getHierarchy', () => {
    it('should call departmentsService.getHierarchy with tenantId', async () => {
      const mockResult = [{ id: 'dept-1', name: 'Engineering', children: [] }];
      service.getHierarchy.mockResolvedValue(mockResult);

      const result = await controller.getHierarchy(adminUser);

      expect(service.getHierarchy).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should call departmentsService.findOne with tenantId and id', async () => {
      const mockResult = { id: 'dept-1', name: 'Engineering' };
      service.findOne.mockResolvedValue(mockResult);

      const result = await controller.findOne(adminUser, 'dept-1');

      expect(service.findOne).toHaveBeenCalledWith('tenant-1', 'dept-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('update', () => {
    it('should delegate update to departmentsService.update', async () => {
      const dto = { name: 'Updated Engineering' };
      const updated = { id: 'dept-1', ...dto };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(adminUser, 'dept-1', dto as any);

      expect(service.update).toHaveBeenCalledWith('tenant-1', 'dept-1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should delegate remove to departmentsService.remove', async () => {
      const response = { success: true, message: 'Department deleted successfully' };
      service.remove.mockResolvedValue(response);

      const result = await controller.remove(adminUser, 'dept-1');

      expect(service.remove).toHaveBeenCalledWith('tenant-1', 'dept-1');
      expect(result).toEqual(response);
    });
  });
});
