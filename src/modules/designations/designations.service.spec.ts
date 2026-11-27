import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DesignationsService } from './designations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers';
import { PositionSsoClient } from '../../common/sso-client/position-sso.client';
import { DepartmentsService } from '../departments/departments.service';

describe('DesignationsService', () => {
  let service: DesignationsService;
  let prisma: any;
  let positionSso: {
    listByCompany: jest.Mock;
    getTree: jest.Mock;
    getById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const tenantId = 'test-tenant';
  const ssoCompanyId = 'sso-company-1';
  const departmentsSync = { syncFromSso: jest.fn() };

  beforeEach(async () => {
    positionSso = {
      listByCompany: jest.fn(),
      getTree: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesignationsService,
        { provide: PrismaService, useValue: createMockPrismaService() },
        { provide: PositionSsoClient, useValue: positionSso },
        { provide: DepartmentsService, useValue: departmentsSync },
      ],
    }).compile();

    service = module.get<DesignationsService>(DesignationsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockDesignation = {
    id: 'desig-1',
    tenantId,
    name: 'Chief Executive Officer',
    code: 'CEO',
    ssoPositionId: 'sso-pos-1',
    parentId: null,
    departmentId: null,
    parent: null,
    children: [],
    employees: [],
    _count: { employees: 1 },
  };

  const mockChildDesignation = {
    id: 'desig-2',
    tenantId,
    name: 'Head of Engineering',
    code: 'HOE',
    ssoPositionId: 'sso-pos-2',
    parentId: 'desig-1',
    departmentId: 'dept-1',
    parent: { id: 'desig-1', name: 'Chief Executive Officer' },
    children: [],
    employees: [],
    _count: { employees: 2 },
  };

  function uniqueConflict(): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['tenantId', 'name'] },
    });
  }

  describe('resolvePositionLevel', () => {
    it('should return COMPANY when departmentId is null or empty', () => {
      expect(service.resolvePositionLevel(null)).toBe('COMPANY');
      expect(service.resolvePositionLevel(undefined as any)).toBe('COMPANY');
    });

    it('should return DIVISION when department classification is DIVISION', () => {
      expect(service.resolvePositionLevel('dept-1', 'DIVISION')).toBe('DIVISION');
    });

    it('should return DEPARTMENT for any other department classification or null', () => {
      expect(service.resolvePositionLevel('dept-1', 'DEPARTMENT')).toBe('DEPARTMENT');
      expect(service.resolvePositionLevel('dept-1', null)).toBe('DEPARTMENT');
      expect(service.resolvePositionLevel('dept-1', undefined)).toBe('DEPARTMENT');
    });
  });

  // ---------------------------------------------------------------------------
  // create / update / remove — Orchestrated SSO Gateway Forwarding
  // ---------------------------------------------------------------------------

  describe('create', () => {
    const createDto = {
      name: 'Lead Engineer',
      code: 'LEAD-ENG',
      departmentId: 'dept-local-1',
      parentId: 'desig-1',
      description: 'Tech lead role',
    };

    it('should forward create to SSO with resolved department & parent, and save locally with ssoPositionId and level', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-local-1',
        ssoDepartmentId: 'sso-dept-1',
        classification: 'DIVISION',
      });
      prisma.designation.findFirst.mockResolvedValue({
        id: 'desig-1',
        ssoPositionId: 'sso-pos-1',
      });
      positionSso.create.mockResolvedValue({
        id: 'sso-pos-new',
        name: 'Lead Engineer',
        code: 'LEAD-ENG',
        companyId: ssoCompanyId,
        departmentId: 'sso-dept-1',
        parentId: 'sso-pos-1',
        description: 'Tech lead role',
        level: 'DIVISION',
      });
      const expectedCreated = {
        id: 'desig-new',
        tenantId,
        name: 'Lead Engineer',
        code: 'LEAD-ENG',
        departmentId: 'dept-local-1',
        parentId: 'desig-1',
        level: 'DIVISION',
        ssoPositionId: 'sso-pos-new',
      };
      prisma.designation.create.mockResolvedValue(expectedCreated);

      const result = await service.create(tenantId, createDto as any);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: tenantId },
        select: { ssoCompanyId: true },
      });
      expect(prisma.department.findFirst).toHaveBeenCalledWith({
        where: { id: 'dept-local-1', tenantId },
      });
      expect(prisma.designation.findFirst).toHaveBeenCalledWith({
        where: { id: 'desig-1', tenantId },
      });
      expect(positionSso.create).toHaveBeenCalledWith({
        name: 'Lead Engineer',
        code: 'LEAD-ENG',
        companyId: ssoCompanyId,
        departmentId: 'sso-dept-1',
        parentId: 'sso-pos-1',
        description: 'Tech lead role',
      });
      expect(prisma.designation.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          name: 'Lead Engineer',
          code: 'LEAD-ENG',
          departmentId: 'dept-local-1',
          parentId: 'desig-1',
          level: 'DIVISION',
          ssoPositionId: 'sso-pos-new',
        },
      });
      expect(result).toEqual(expectedCreated);
    });

    it('should create directly in local Prisma if tenant has no ssoCompanyId and calculate level', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId: null });
      const expectedCreated = {
        id: 'desig-new',
        tenantId,
        name: 'Lead Engineer',
        code: 'LEAD-ENG',
        departmentId: null,
        parentId: null,
        level: 'COMPANY',
        ssoPositionId: null,
      };
      prisma.designation.create.mockResolvedValue(expectedCreated);

      const result = await service.create(tenantId, {
        name: 'Lead Engineer',
        code: 'LEAD-ENG',
      });

      expect(positionSso.create).not.toHaveBeenCalled();
      expect(prisma.designation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          name: 'Lead Engineer',
          code: 'LEAD-ENG',
          level: 'COMPANY',
        }),
      });
      expect(result).toEqual(expectedCreated);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if designation does not exist', async () => {
      prisma.designation.findFirst.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'non-existent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should forward update to SSO and update local Prisma designation with level', async () => {
      prisma.designation.findFirst
        .mockResolvedValueOnce({
          id: 'desig-1',
          tenantId,
          name: 'Lead Engineer',
          code: 'LEAD-ENG',
          ssoPositionId: 'sso-pos-1',
          departmentId: 'dept-1',
          level: 'DEPARTMENT',
        })
        .mockResolvedValueOnce({
          id: 'parent-desig-2',
          ssoPositionId: 'sso-pos-parent-2',
        });
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-2',
        ssoDepartmentId: 'sso-dept-2',
        classification: 'DIVISION',
      });
      positionSso.update.mockResolvedValue({
        id: 'sso-pos-1',
        name: 'Staff Engineer',
        code: 'STAFF-ENG',
        level: 'DIVISION',
      });
      const expectedUpdated = {
        id: 'desig-1',
        tenantId,
        name: 'Staff Engineer',
        code: 'STAFF-ENG',
        departmentId: 'dept-2',
        parentId: 'parent-desig-2',
        level: 'DIVISION',
        ssoPositionId: 'sso-pos-1',
      };
      prisma.designation.update.mockResolvedValue(expectedUpdated);

      const result = await service.update(tenantId, 'desig-1', {
        name: 'Staff Engineer',
        code: 'STAFF-ENG',
        departmentId: 'dept-2',
        parentId: 'parent-desig-2',
        description: 'Updated desc',
      });

      expect(positionSso.update).toHaveBeenCalledWith('sso-pos-1', {
        name: 'Staff Engineer',
        code: 'STAFF-ENG',
        departmentId: 'sso-dept-2',
        parentId: 'sso-pos-parent-2',
        description: 'Updated desc',
      });
      expect(prisma.designation.update).toHaveBeenCalledWith({
        where: { id: 'desig-1' },
        data: expect.objectContaining({
          name: 'Staff Engineer',
          code: 'STAFF-ENG',
          departmentId: 'dept-2',
          parentId: 'parent-desig-2',
          level: 'DIVISION',
        }),
      });
      expect(result).toEqual(expectedUpdated);
    });

    it('should update local Prisma directly if designation has no ssoPositionId', async () => {
      prisma.designation.findFirst.mockResolvedValue({
        id: 'desig-1',
        tenantId,
        name: 'Lead Engineer',
        code: 'LEAD-ENG',
        ssoPositionId: null,
      });
      const expectedUpdated = {
        id: 'desig-1',
        tenantId,
        name: 'Staff Engineer',
        ssoPositionId: null,
      };
      prisma.designation.update.mockResolvedValue(expectedUpdated);

      const result = await service.update(tenantId, 'desig-1', {
        name: 'Staff Engineer',
      });

      expect(positionSso.update).not.toHaveBeenCalled();
      expect(prisma.designation.update).toHaveBeenCalledWith({
        where: { id: 'desig-1' },
        data: expect.objectContaining({
          name: 'Staff Engineer',
        }),
      });
      expect(result).toEqual(expectedUpdated);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if designation does not exist', async () => {
      prisma.designation.findFirst.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if designation has children or active employees', async () => {
      prisma.designation.findFirst.mockResolvedValue({
        id: 'desig-1',
        tenantId,
        children: [{ id: 'desig-child-1' }],
        employees: [],
      });

      await expect(service.remove(tenantId, 'desig-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove(tenantId, 'desig-1')).rejects.toThrow(
        'Cannot delete designation with active employees or sub-units',
      );
    });

    it('should forward delete to SSO and delete from local Prisma', async () => {
      prisma.designation.findFirst.mockResolvedValue({
        id: 'desig-1',
        tenantId,
        ssoPositionId: 'sso-pos-1',
        children: [],
        employees: [],
      });
      positionSso.delete.mockResolvedValue(undefined);
      prisma.designation.delete.mockResolvedValue({ id: 'desig-1' });

      const result = await service.remove(tenantId, 'desig-1');

      expect(positionSso.delete).toHaveBeenCalledWith('sso-pos-1');
      expect(prisma.designation.delete).toHaveBeenCalledWith({
        where: { id: 'desig-1' },
      });
      expect(result).toEqual({
        success: true,
        message: 'Designation deleted successfully',
      });
    });

    it('should delete from local Prisma without calling SSO if designation has no ssoPositionId', async () => {
      prisma.designation.findFirst.mockResolvedValue({
        id: 'desig-1',
        tenantId,
        ssoPositionId: null,
        children: [],
        employees: [],
      });
      prisma.designation.delete.mockResolvedValue({ id: 'desig-1' });

      const result = await service.remove(tenantId, 'desig-1');

      expect(positionSso.delete).not.toHaveBeenCalled();
      expect(prisma.designation.delete).toHaveBeenCalledWith({
        where: { id: 'desig-1' },
      });
      expect(result).toEqual({
        success: true,
        message: 'Designation deleted successfully',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // syncFromSso
  // ---------------------------------------------------------------------------

  describe('syncFromSso', () => {
    it('should skip SSO when tenant has no ssoCompanyId', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        ssoCompanyId: null,
      });

      await service.syncFromSso(tenantId);

      expect(positionSso.listByCompany).not.toHaveBeenCalled();
      expect(prisma.designation.upsert).not.toHaveBeenCalled();
    });

    it('should upsert SSO rows without parent then set parentId in second pass', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        ssoCompanyId,
      });
      prisma.department.findMany.mockResolvedValue([
        { id: 'dept-local-1', ssoDepartmentId: 'sso-dept-1', classification: 'DIVISION' },
      ]);

      const ssoPositions = [
        {
          id: 'sso-pos-1',
          name: 'Chief Executive Officer',
          code: 'CEO',
          companyId: ssoCompanyId,
          departmentId: null,
          parentId: null,
          description: 'CEO position',
        },
        {
          id: 'sso-pos-2',
          name: 'Head of Engineering',
          code: 'HOE',
          companyId: ssoCompanyId,
          departmentId: 'sso-dept-1',
          parentId: 'sso-pos-1',
          description: 'HOE position',
        },
      ];

      positionSso.listByCompany.mockResolvedValue(ssoPositions);

      prisma.designation.upsert
        .mockResolvedValueOnce({ id: 'desig-1', name: 'Chief Executive Officer' })
        .mockResolvedValueOnce({ id: 'desig-2', name: 'Head of Engineering' });

      prisma.designation.update.mockResolvedValue({});

      await service.syncFromSso(tenantId);

      expect(positionSso.listByCompany).toHaveBeenCalledWith(ssoCompanyId);
      expect(prisma.designation.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.designation.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          create: expect.objectContaining({
            name: 'Chief Executive Officer',
            level: 'COMPANY',
          }),
          update: expect.objectContaining({
            name: 'Chief Executive Officer',
            level: 'COMPANY',
          }),
        }),
      );
      expect(prisma.designation.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          create: expect.objectContaining({
            name: 'Head of Engineering',
            level: 'DIVISION',
          }),
          update: expect.objectContaining({
            name: 'Head of Engineering',
            level: 'DIVISION',
          }),
        }),
      );
      expect(prisma.designation.update).toHaveBeenCalledWith({
        where: { id: 'desig-2' },
        data: { parentId: 'desig-1' },
      });
    });

    it('should disambiguate name when another designation already uses it', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        ssoCompanyId,
      });
      prisma.department.findMany.mockResolvedValue([]);

      const ssoPositions = [
        {
          id: 'sso-pos-abc12345',
          name: 'Adventure Guide',
          code: 'ADVENTUREGUIDE1',
          companyId: ssoCompanyId,
          departmentId: null,
          parentId: null,
          description: null,
        },
      ];

      positionSso.listByCompany.mockResolvedValue(ssoPositions);
      prisma.designation.findUnique.mockResolvedValue({
        id: 'desig-existing',
        ssoPositionId: 'other-sso-pos',
      });
      prisma.designation.upsert
        .mockRejectedValueOnce(uniqueConflict())
        .mockResolvedValueOnce({ id: 'desig-3', name: 'Adventure Guide (ADVENTUREGUIDE1)' });
      prisma.designation.update.mockResolvedValue({ id: 'desig-3' });

      await service.syncFromSso(tenantId);

      expect(prisma.designation.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_name: { tenantId, name: 'Adventure Guide' },
        },
        select: { id: true, ssoPositionId: true },
      });
      expect(prisma.designation.upsert).toHaveBeenLastCalledWith({
        where: { ssoPositionId: 'sso-pos-abc12345' },
        create: expect.objectContaining({
          name: 'Adventure Guide (ADVENTUREGUIDE1)',
          code: 'ADVENTUREGUIDE1',
        }),
        update: expect.objectContaining({
          name: 'Adventure Guide (ADVENTUREGUIDE1)',
          code: 'ADVENTUREGUIDE1',
        }),
      });
    });

    it('should attach ssoPositionId when the same name belongs to an unlinked designation', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        ssoCompanyId,
      });
      prisma.department.findMany.mockResolvedValue([]);

      positionSso.listByCompany.mockResolvedValue([
        {
          id: 'sso-pos-abc12345',
          name: 'Staff Engineer',
          code: 'SE',
          companyId: ssoCompanyId,
          departmentId: null,
          parentId: null,
          description: null,
        },
      ]);
      prisma.designation.findUnique.mockResolvedValue({
        id: 'desig-local',
        ssoPositionId: null,
      });
      prisma.designation.upsert.mockRejectedValueOnce(uniqueConflict());
      prisma.designation.update.mockResolvedValue({ id: 'desig-local' });

      await service.syncFromSso(tenantId);

      expect(prisma.designation.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.designation.update).toHaveBeenCalledWith({
        where: { id: 'desig-local' },
        data: expect.objectContaining({
          ssoPositionId: 'sso-pos-abc12345',
          code: 'SE',
        }),
      });
    });
  });

  // ---------------------------------------------------------------------------
  // findAll & getTree
  // ---------------------------------------------------------------------------

  describe('findAll', () => {
    it('should sync from SSO then return local designations', async () => {
      const mockList = [mockDesignation, mockChildDesignation];
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      positionSso.listByCompany.mockResolvedValue([]);
      prisma.department.findMany.mockResolvedValue([]);
      prisma.designation.findMany.mockResolvedValue(mockList);

      const result = await service.findAll(tenantId);

      expect(positionSso.listByCompany).toHaveBeenCalledWith(ssoCompanyId);
      expect(result).toEqual(mockList);
      expect(prisma.designation.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        include: {
          parent: true,
          children: true,
          department: {
            include: {
              parent: true,
            },
          },
          employees: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              email: true,
            },
          },
          _count: { select: { employees: true } },
        },
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
      });
    });

    it('should gracefully handle SSO sync errors and return local designations', async () => {
      const mockList = [mockDesignation];
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      positionSso.listByCompany.mockRejectedValue(new Error('SSO timeout'));
      prisma.designation.findMany.mockResolvedValue(mockList);

      const result = await service.findAll(tenantId);

      expect(result).toEqual(mockList);
    });
  });

  describe('getTree', () => {
    it('should sync from SSO then return root designations with children', async () => {
      const rawFlatList = [
        { ...mockDesignation, parentId: null },
        { ...mockChildDesignation, parentId: 'desig-1' },
      ];
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      positionSso.listByCompany.mockResolvedValue([]);
      prisma.department.findMany.mockResolvedValue([]);
      prisma.designation.findMany.mockResolvedValue(rawFlatList);

      const result = await service.getTree(tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('desig-1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('desig-2');
      expect(prisma.designation.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
        include: {
          department: {
            include: {
              parent: true,
            },
          },
          employees: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              email: true,
            },
          },
          _count: { select: { employees: true } },
        },
      });
    });

    it('should preserve SSO parent-child order and exclude unlinked local leftovers', async () => {
      const ssoTree = [
        {
          id: 'sso-pos-1',
          code: 'HGM',
          name: 'Head of GM',
          parentId: null,
          departmentId: null,
          companyId: ssoCompanyId,
          description: null,
          path: 'sso-pos-1/',
          level: 'COMPANY' as const,
          children: [
            {
              id: 'sso-pos-2',
              code: 'HOD-ICT',
              name: 'Head of Division ICT',
              parentId: 'sso-pos-1',
              departmentId: null,
              companyId: ssoCompanyId,
              description: null,
              path: 'sso-pos-1/sso-pos-2/',
              level: 'DIVISION' as const,
              children: [
                {
                  id: 'sso-pos-3',
                  code: 'TCK',
                  name: 'Ticketing Staff',
                  parentId: 'sso-pos-2',
                  departmentId: 'sso-dept-1',
                  companyId: ssoCompanyId,
                  description: null,
                  path: 'sso-pos-1/sso-pos-2/sso-pos-3/',
                  level: 'DEPARTMENT' as const,
                  children: [],
                },
              ],
            },
          ],
        },
      ];

      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      positionSso.getTree.mockResolvedValue(ssoTree);
      positionSso.listByCompany.mockResolvedValue([]);
      prisma.department.findMany.mockResolvedValue([]);
      prisma.designation.upsert.mockImplementation(({ where }: any) =>
        Promise.resolve({ id: `local-${where.ssoPositionId}` }),
      );
      prisma.designation.update.mockResolvedValue({});
      prisma.designation.findMany.mockResolvedValue([
        { ...mockDesignation, id: 'local-sso-pos-1', ssoPositionId: 'sso-pos-1', name: 'Head of GM' },
        { ...mockChildDesignation, id: 'local-sso-pos-2', ssoPositionId: 'sso-pos-2', name: 'Head of Division ICT', parentId: 'local-sso-pos-1' },
        {
          id: 'local-sso-pos-3',
          tenantId,
          name: 'Ticketing Staff',
          code: 'TCK',
          ssoPositionId: 'sso-pos-3',
          parentId: 'local-sso-pos-2',
          employees: [],
          _count: { employees: 1 },
        },
        {
          id: 'orphan-local',
          tenantId,
          name: 'Orphan leftover',
          code: 'ORPH',
          ssoPositionId: null,
          parentId: null,
          employees: [],
          _count: { employees: 0 },
        },
      ]);

      const result = await service.getTree(tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('local-sso-pos-1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('local-sso-pos-2');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].id).toBe('local-sso-pos-3');
      expect(JSON.stringify(result)).not.toContain('orphan-local');
    });

    it('nests a position that has no SSO line report under its department head', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      positionSso.getTree.mockResolvedValue([]);
      positionSso.listByCompany.mockResolvedValue([]);
      prisma.department.findMany.mockResolvedValue([
        { id: 'div-horeca', parentId: null, classification: 'DIVISION' },
        { id: 'dept-fnb', parentId: 'div-horeca', classification: 'DEPARTMENT' },
      ]);
      prisma.designation.update.mockResolvedValue({});
      prisma.designation.findMany.mockResolvedValue([
        {
          id: 'ceo',
          tenantId,
          name: 'CEO',
          code: 'CEO',
          ssoPositionId: 'sso-ceo',
          parentId: null,
          departmentId: null,
          employees: [],
          _count: { employees: 0 },
        },
        {
          id: 'head-fnb',
          tenantId,
          name: 'Head of Dept.Food & Beverage',
          code: 'HOR020001',
          ssoPositionId: 'sso-head',
          parentId: 'div-head',
          departmentId: 'dept-fnb',
          employees: [],
          _count: { employees: 0 },
        },
        {
          id: 'div-head',
          tenantId,
          name: 'Head of Division HORECA',
          code: 'HOR000001',
          ssoPositionId: 'sso-div',
          parentId: 'ceo',
          departmentId: 'div-horeca',
          employees: [],
          _count: { employees: 0 },
        },
        {
          id: 'barista',
          tenantId,
          name: 'Barista',
          code: 'BARISTA',
          ssoPositionId: 'sso-barista',
          parentId: null,
          departmentId: 'dept-fnb',
          employees: [],
          _count: { employees: 0 },
        },
      ]);

      const result = await service.getTree(tenantId);
      const ceo = result.find((node: { id: string }) => node.id === 'ceo');
      const division = ceo?.children?.find((node: { id: string }) => node.id === 'div-head');
      const head = division?.children?.find((node: { id: string }) => node.id === 'head-fnb');

      expect(result.map((node: { id: string }) => node.id)).toEqual(['ceo']);
      expect(head?.children?.map((node: { id: string }) => node.id)).toEqual(['barista']);
    });
  });

  describe('syncOrgFromSso', () => {
    it('pulls departments and positions without creating employees', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId });
      positionSso.getTree.mockResolvedValue([
        {
          id: 'sso-pos-1',
          code: 'CEO',
          name: 'CEO',
          parentId: null,
          departmentId: null,
          companyId: ssoCompanyId,
          description: null,
          path: 'sso-pos-1/',
          level: 'COMPANY',
          users: [
            {
              id: 'user-1',
              name: 'Ada Lovelace',
              email: 'ada@example.com',
              image: null,
            },
          ],
          children: [],
        },
      ]);
      prisma.department.findMany.mockResolvedValue([]);
      prisma.designation.upsert.mockImplementation(({ where }: { where: { ssoPositionId: string } }) =>
        Promise.resolve({ id: `local-${where.ssoPositionId}` }),
      );
      prisma.designation.update.mockResolvedValue({});
      prisma.designation.findMany.mockResolvedValue([]);
      prisma.department.count.mockResolvedValue(2);
      prisma.designation.count.mockResolvedValue(1);

      const result = await service.syncOrgFromSso(tenantId);

      expect(departmentsSync.syncFromSso).toHaveBeenCalledWith(tenantId, { strict: true });
      expect(prisma.employee.create).not.toHaveBeenCalled();
      expect(prisma.employee.update).not.toHaveBeenCalled();
      expect(result).toEqual({ departments: 2, positions: 1 });
    });
  });

  describe('findOne', () => {
    it('should return designation by id', async () => {
      prisma.designation.findFirst.mockResolvedValue(mockDesignation);

      const result = await service.findOne(tenantId, 'desig-1');

      expect(result).toEqual(mockDesignation);
    });

    it('should throw NotFoundException when designation does not exist', async () => {
      prisma.designation.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
