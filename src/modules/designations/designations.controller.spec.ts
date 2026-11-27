import { Test, TestingModule } from '@nestjs/testing';
import { overrideJwtAuthGuard } from '../../test/helpers';
import { DesignationsController } from './designations.controller';
import { DesignationsService } from './designations.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

const mockDesignationsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  getTree: jest.fn(),
  syncOrgFromSso: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('DesignationsController', () => {
  let controller: DesignationsController;
  let service: typeof mockDesignationsService;

  const mockUser: AuthenticatedUser = {
    userId: 'user-1',
    email: 'hr@example.com',
    tenantId: 'tenant-1',
    role: UserRole.HR_ADMIN,
  };

  beforeEach(async () => {
    Object.values(mockDesignationsService).forEach((fn) => fn.mockReset());

    const module: TestingModule = await overrideJwtAuthGuard(
      Test.createTestingModule({
        controllers: [DesignationsController],
        providers: [
          { provide: DesignationsService, useValue: mockDesignationsService },
        ],
      }),
    ).compile();

    controller = module.get<DesignationsController>(DesignationsController);
    service = module.get(DesignationsService);
  });

  describe('create', () => {
    it('delegates to service.create with tenantId and dto', async () => {
      const dto = { name: 'Manager', code: 'MGR', departmentId: 'dept-1' };
      const created = { id: 'd1', ...dto };
      service.create.mockResolvedValue(created);

      const result = await controller.create(mockUser, dto as any);

      expect(service.create).toHaveBeenCalledWith('tenant-1', dto);
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('delegates to service.findAll with tenantId', async () => {
      service.findAll.mockResolvedValue([{ id: 'd1', name: 'Developer' }]);

      const result = await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual([{ id: 'd1', name: 'Developer' }]);
    });
  });

  describe('syncFromSso', () => {
    it('delegates org sync to the service', async () => {
      service.syncOrgFromSso.mockResolvedValue({
        departments: 2,
        positions: 3,
      });

      const result = await controller.syncFromSso(mockUser);

      expect(service.syncOrgFromSso).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual({ departments: 2, positions: 3 });
    });
  });

  describe('getTree', () => {
    it('delegates to service.getTree with tenantId', async () => {
      service.getTree.mockResolvedValue([{ id: 'd1', name: 'CEO', children: [] }]);

      const result = await controller.getTree(mockUser);

      expect(service.getTree).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual([{ id: 'd1', name: 'CEO', children: [] }]);
    });
  });

  describe('findOne', () => {
    it('delegates to service.findOne', async () => {
      service.findOne.mockResolvedValue({ id: 'd1', name: 'Developer' });

      const result = await controller.findOne(mockUser, 'd1');

      expect(service.findOne).toHaveBeenCalledWith('tenant-1', 'd1');
      expect(result).toEqual({ id: 'd1', name: 'Developer' });
    });
  });

  describe('update', () => {
    it('delegates to service.update with tenantId, id, and dto', async () => {
      const dto = { name: 'Lead' };
      const updated = { id: 'd1', name: 'Lead' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(mockUser, 'd1', dto as any);

      expect(service.update).toHaveBeenCalledWith('tenant-1', 'd1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('delegates to service.remove with tenantId and id', async () => {
      const res = { success: true, message: 'Designation deleted successfully' };
      service.remove.mockResolvedValue(res);

      const result = await controller.remove(mockUser, 'd1');

      expect(service.remove).toHaveBeenCalledWith('tenant-1', 'd1');
      expect(result).toEqual(res);
    });
  });
});
