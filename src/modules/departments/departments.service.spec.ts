import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers';
import { DepartmentSsoClient } from '../../common/sso-client/department-sso.client';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let prisma: any;
  let departmentSso: {
    listByCompany: jest.Mock;
    getById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const tenantId = 'test-tenant';
  const ssoCompanyId = 'sso-company-1';

  beforeEach(async () => {
    departmentSso = {
      listByCompany: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: PrismaService, useValue: createMockPrismaService() },
        { provide: DepartmentSsoClient, useValue: departmentSso },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockDepartment = {
    id: 'dept-1',
    tenantId,
    name: 'Engineering',
    code: 'ENG',
    ssoDepartmentId: 'sso-dept-1',
    classification: 'DIVISION',
    parentId: null,
    description: 'Engineering department',
    parent: null,
    children: [],
    employees: [],
    _count: { employees: 5 },
  };

  const mockChildDepartment = {
    id: 'dept-2',
    tenantId,
    name: 'Frontend',
    code: 'FE',
    ssoDepartmentId: 'sso-dept-2',
    classification: 'DEPARTMENT',
    parentId: 'dept-1',
    description: 'Frontend team',
    parent: { id: 'dept-1', name: 'Engineering' },
    children: [],
    employees: [],
    _count: { employees: 3 },
  };

  function uniqueConflict(): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['tenantId', 'code'] },
    });
  }

  // ---------------------------------------------------------------------------
  // create / update / remove — Orchestrated SSO Gateway Forwarding
  // ---------------------------------------------------------------------------

  describe('create', () => {
    const createDto = {
      name: 'Engineering',
      code: 'ENG',
      description: 'Engineering department',
      classification: 'DIVISION',
      parentId: 'parent-dept-id',
    };

    it('should forward create to SSO and save locally with ssoDepartmentId when tenant has ssoCompanyId', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      prisma.department.findFirst.mockResolvedValue({
        id: 'parent-dept-id',
        ssoDepartmentId: 'sso-parent-id',
      });
      departmentSso.create.mockResolvedValue({
        id: 'sso-new-id',
        name: 'Engineering',
        code: 'ENG',
        companyId: ssoCompanyId,
        parentId: 'sso-parent-id',
      });
      const expectedCreated = {
        id: 'dept-new',
        tenantId,
        name: 'Engineering',
        code: 'ENG',
        parentId: 'parent-dept-id',
        classification: 'DIVISION',
        description: 'Engineering department',
        ssoDepartmentId: 'sso-new-id',
      };
      prisma.department.create.mockResolvedValue(expectedCreated);

      const result = await service.create(tenantId, createDto as any);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: tenantId },
        select: { ssoCompanyId: true },
      });
      expect(prisma.department.findFirst).toHaveBeenCalledWith({
        where: { id: 'parent-dept-id', tenantId },
      });
      expect(departmentSso.create).toHaveBeenCalledWith({
        name: 'Engineering',
        code: 'ENG',
        companyId: ssoCompanyId,
        parentId: 'sso-parent-id',
        classification: 'DIVISION',
        description: 'Engineering department',
      });
      expect(prisma.department.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          name: 'Engineering',
          code: 'ENG',
          parentId: 'parent-dept-id',
          classification: 'DIVISION',
          description: 'Engineering department',
          ssoDepartmentId: 'sso-new-id',
        },
      });
      expect(result).toEqual(expectedCreated);
    });

    it('should create directly in local Prisma if tenant has no ssoCompanyId', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId: null });
      const expectedCreated = {
        id: 'dept-new',
        tenantId,
        name: 'Engineering',
        code: 'ENG',
        parentId: null,
        description: 'Local only dept',
        classification: undefined,
        ssoDepartmentId: null,
      };
      prisma.department.create.mockResolvedValue(expectedCreated);

      const result = await service.create(tenantId, {
        name: 'Engineering',
        code: 'ENG',
        description: 'Local only dept',
      });

      expect(departmentSso.create).not.toHaveBeenCalled();
      expect(prisma.department.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          name: 'Engineering',
          code: 'ENG',
          description: 'Local only dept',
        }),
      });
      expect(result).toEqual(expectedCreated);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if department does not exist', async () => {
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'non-existent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should forward update to SSO and update local Prisma department', async () => {
      prisma.department.findFirst
        .mockResolvedValueOnce({
          id: 'dept-1',
          tenantId,
          name: 'Engineering',
          code: 'ENG',
          ssoDepartmentId: 'sso-dept-1',
        })
        .mockResolvedValueOnce({
          id: 'parent-dept-2',
          ssoDepartmentId: 'sso-parent-2',
        });
      departmentSso.update.mockResolvedValue({
        id: 'sso-dept-1',
        name: 'Engineering V2',
        code: 'ENG2',
      });
      const expectedUpdated = {
        id: 'dept-1',
        tenantId,
        name: 'Engineering V2',
        code: 'ENG2',
        parentId: 'parent-dept-2',
        description: 'Updated desc',
        classification: 'DEPARTMENT',
        ssoDepartmentId: 'sso-dept-1',
      };
      prisma.department.update.mockResolvedValue(expectedUpdated);

      const result = await service.update(tenantId, 'dept-1', {
        name: 'Engineering V2',
        code: 'ENG2',
        parentId: 'parent-dept-2',
        description: 'Updated desc',
        classification: 'DEPARTMENT',
      });

      expect(departmentSso.update).toHaveBeenCalledWith('sso-dept-1', {
        name: 'Engineering V2',
        code: 'ENG2',
        parentId: 'sso-parent-2',
        classification: 'DEPARTMENT',
        description: 'Updated desc',
      });
      expect(prisma.department.update).toHaveBeenCalledWith({
        where: { id: 'dept-1' },
        data: expect.objectContaining({
          name: 'Engineering V2',
          code: 'ENG2',
          parentId: 'parent-dept-2',
          description: 'Updated desc',
          classification: 'DEPARTMENT',
        }),
      });
      expect(result).toEqual(expectedUpdated);
    });

    it('should update local Prisma directly if department has no ssoDepartmentId', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        tenantId,
        name: 'Engineering',
        code: 'ENG',
        ssoDepartmentId: null,
      });
      const expectedUpdated = {
        id: 'dept-1',
        tenantId,
        name: 'Engineering V2',
        ssoDepartmentId: null,
      };
      prisma.department.update.mockResolvedValue(expectedUpdated);

      const result = await service.update(tenantId, 'dept-1', {
        name: 'Engineering V2',
      });

      expect(departmentSso.update).not.toHaveBeenCalled();
      expect(prisma.department.update).toHaveBeenCalledWith({
        where: { id: 'dept-1' },
        data: expect.objectContaining({
          name: 'Engineering V2',
        }),
      });
      expect(result).toEqual(expectedUpdated);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if department does not exist', async () => {
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if department has children or active employees', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        tenantId,
        children: [{ id: 'dept-child-1' }],
        employees: [],
      });

      await expect(service.remove(tenantId, 'dept-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove(tenantId, 'dept-1')).rejects.toThrow(
        'Cannot delete department with active employees or sub-units',
      );
    });

    it('should forward delete to SSO and delete from local Prisma', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        tenantId,
        ssoDepartmentId: 'sso-dept-1',
        children: [],
        employees: [],
      });
      departmentSso.delete.mockResolvedValue(undefined);
      prisma.department.delete.mockResolvedValue({ id: 'dept-1' });

      const result = await service.remove(tenantId, 'dept-1');

      expect(departmentSso.delete).toHaveBeenCalledWith('sso-dept-1');
      expect(prisma.department.delete).toHaveBeenCalledWith({
        where: { id: 'dept-1' },
      });
      expect(result).toEqual({
        success: true,
        message: 'Department deleted successfully',
      });
    });

    it('should delete from local Prisma without calling SSO if department has no ssoDepartmentId', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        tenantId,
        ssoDepartmentId: null,
        children: [],
        employees: [],
      });
      prisma.department.delete.mockResolvedValue({ id: 'dept-1' });

      const result = await service.remove(tenantId, 'dept-1');

      expect(departmentSso.delete).not.toHaveBeenCalled();
      expect(prisma.department.delete).toHaveBeenCalledWith({
        where: { id: 'dept-1' },
      });
      expect(result).toEqual({
        success: true,
        message: 'Department deleted successfully',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // syncFromSso
  // ---------------------------------------------------------------------------

  describe('syncFromSso', () => {
    const ssoParent = {
      id: 'sso-parent',
      code: 'ENG',
      name: 'Engineering',
      companyId: ssoCompanyId,
      parentId: null,
      description: null,
      classification: 'DIVISION' as const,
    };

    const ssoChild = {
      id: 'sso-child',
      code: 'FE',
      name: 'Frontend',
      companyId: ssoCompanyId,
      parentId: 'sso-parent',
      description: null,
      classification: 'DEPARTMENT' as const,
    };

    it('should skip SSO when tenant has no ssoCompanyId', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        ssoCompanyId: null,
      });

      await service.syncFromSso(tenantId);

      expect(departmentSso.listByCompany).not.toHaveBeenCalled();
      expect(prisma.department.upsert).not.toHaveBeenCalled();
    });

    it('should skip SSO when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await service.syncFromSso(tenantId);

      expect(departmentSso.listByCompany).not.toHaveBeenCalled();
    });

    it('should upsert SSO rows without parent then set parentId in a second pass', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      departmentSso.listByCompany.mockResolvedValue([ssoParent, ssoChild]);
      prisma.department.upsert
        .mockResolvedValueOnce({ id: 'local-parent', ssoDepartmentId: 'sso-parent' })
        .mockResolvedValueOnce({ id: 'local-child', ssoDepartmentId: 'sso-child' });
      prisma.department.update.mockResolvedValue({});

      await service.syncFromSso(tenantId);

      expect(departmentSso.listByCompany).toHaveBeenCalledWith(ssoCompanyId);
      expect(prisma.department.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.department.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { ssoDepartmentId: 'sso-parent' },
          create: expect.objectContaining({
            tenantId,
            name: 'Engineering',
            code: 'ENG',
            ssoDepartmentId: 'sso-parent',
            classification: 'DIVISION',
          }),
          update: expect.objectContaining({
            name: 'Engineering',
            code: 'ENG',
            classification: 'DIVISION',
          }),
        }),
      );
      expect(prisma.department.upsert.mock.calls[0][0].create.parentId).toBeUndefined();
      expect(prisma.department.upsert.mock.calls[0][0].update.parentId).toBeUndefined();
      expect(prisma.department.upsert.mock.calls[1][0].create.parentId).toBeUndefined();

      expect(prisma.department.update).toHaveBeenCalledWith({
        where: { id: 'local-child' },
        data: { parentId: 'local-parent' },
      });
      expect(prisma.department.update).toHaveBeenCalledWith({
        where: { id: 'local-parent' },
        data: { parentId: null },
      });
    });

    it('should suffix code with ssoId slice when unique constraint conflicts', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      departmentSso.listByCompany.mockResolvedValue([ssoParent]);
      prisma.department.upsert
        .mockRejectedValueOnce(uniqueConflict())
        .mockResolvedValueOnce({ id: 'local-parent', ssoDepartmentId: 'sso-parent' });
      prisma.department.update.mockResolvedValue({});

      await service.syncFromSso(tenantId);

      const suffixed = `ENG-${ssoParent.id.slice(0, 6)}`;
      expect(prisma.department.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { ssoDepartmentId: 'sso-parent' },
          create: expect.objectContaining({ code: suffixed }),
          update: expect.objectContaining({ code: suffixed }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------

  describe('findAll', () => {
    it('should sync from SSO then return local departments', async () => {
      const mockDepartments = [mockDepartment, mockChildDepartment];
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      departmentSso.listByCompany.mockResolvedValue([]);
      prisma.department.findMany.mockResolvedValue(mockDepartments);

      const result = await service.findAll(tenantId);

      expect(departmentSso.listByCompany).toHaveBeenCalledWith(ssoCompanyId);
      expect(result).toEqual(mockDepartments);
      expect(result[0]).toEqual(
        expect.objectContaining({
          ssoDepartmentId: 'sso-dept-1',
          classification: 'DIVISION',
        }),
      );
      expect(prisma.department.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        include: {
          parent: true,
          children: true,
          _count: { select: { employees: true } },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no departments exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        ssoCompanyId: null,
      });
      prisma.department.findMany.mockResolvedValue([]);

      const result = await service.findAll(tenantId);

      expect(result).toEqual([]);
      expect(departmentSso.listByCompany).not.toHaveBeenCalled();
    });

    it('should gracefully handle SSO sync errors and return local departments', async () => {
      const mockDepartments = [mockDepartment];
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      departmentSso.listByCompany.mockRejectedValue(new Error('SSO timeout'));
      prisma.department.findMany.mockResolvedValue(mockDepartments);

      const result = await service.findAll(tenantId);

      expect(departmentSso.listByCompany).toHaveBeenCalledWith(ssoCompanyId);
      expect(result).toEqual(mockDepartments);
    });
  });

  // ---------------------------------------------------------------------------
  // getHierarchy
  // ---------------------------------------------------------------------------

  describe('getHierarchy', () => {
    it('should sync from SSO then return root departments with nested children', async () => {
      const hierarchyResult = [
        {
          ...mockDepartment,
          children: [
            {
              ...mockChildDepartment,
              children: [],
            },
          ],
        },
      ];

      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      departmentSso.listByCompany.mockResolvedValue([]);
      prisma.department.findMany.mockResolvedValue(hierarchyResult);

      const result = await service.getHierarchy(tenantId);

      expect(departmentSso.listByCompany).toHaveBeenCalledWith(ssoCompanyId);
      expect(result).toEqual(hierarchyResult);
      expect(result[0]).toEqual(
        expect.objectContaining({
          ssoDepartmentId: 'sso-dept-1',
          classification: 'DIVISION',
        }),
      );
      expect(prisma.department.findMany).toHaveBeenCalledWith({
        where: { tenantId, parentId: null },
        include: {
          children: {
            include: {
              children: true,
            },
          },
          _count: { select: { employees: true } },
        },
        orderBy: [{ classification: 'asc' }, { name: 'asc' }],
      });
    });

    it('should return empty array when no root departments exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        ssoCompanyId: null,
      });
      prisma.department.findMany.mockResolvedValue([]);

      const result = await service.getHierarchy(tenantId);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------

  describe('findOne', () => {
    it('should return department by id', async () => {
      prisma.department.findFirst.mockResolvedValue(mockDepartment);

      const result = await service.findOne(tenantId, 'dept-1');

      expect(result).toEqual(mockDepartment);
      expect(prisma.department.findFirst).toHaveBeenCalledWith({
        where: { id: 'dept-1', tenantId },
        include: {
          parent: true,
          children: true,
          employees: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              designationId: true,
              status: true,
            },
          },
          _count: { select: { employees: true } },
        },
      });
    });

    it('should throw NotFoundException when department does not exist', async () => {
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne(tenantId, 'non-existent')).rejects.toThrow(
        'Department not found',
      );
    });
  });
});
