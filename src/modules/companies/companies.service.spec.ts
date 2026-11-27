import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, GoneException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers';
import { StorageService } from '../../common/storage/storage.service';
import { CompanySsoClient } from '../../common/sso-client/company-sso.client';
import { CreateCompanyDto, UpdateCompanyDto, CompanyQueryDto } from './dto/company.dto';

const SSO_MANAGE_MESSAGE = 'Manage companies in SSO';

const ssoAcme = {
  id: 'sso-1',
  code: 'ACME',
  name: 'Acme SSO',
  address: 'SSO Address',
  phone: '123',
  logo: 'https://sso/logo.png',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function overlayTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tenant-1',
    name: 'Local Name',
    code: 'LOCAL',
    ssoCompanyId: 'sso-1',
    isActive: true,
    logoUrl: 'local-logo.png',
    officeLatitude: -6.2,
    officeLongitude: 106.8,
    officeRadiusMeters: 100,
    timezone: 'Asia/Jakarta',
    currency: 'IDR',
    _count: { employees: 10, users: 3, departments: 2, leaveTypes: 3, otRules: 1 },
    ...overrides,
  };
}

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: any;
  let companySso: {
    listCompanies: jest.Mock;
    getCompanyById: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    companySso = {
      listCompanies: jest.fn(),
      getCompanyById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: createMockPrismaService() },
        { provide: StorageService, useValue: { upload: jest.fn(), delete: jest.fn(), getFilePath: jest.fn() } },
        { provide: CompanySsoClient, useValue: companySso },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateCompanyDto = {
      name: 'Acme Corp',
      code: 'ACME',
      adminEmail: 'admin@acme.com',
      adminPassword: 'Secret123',
      adminFirstName: 'John',
      adminLastName: 'Doe',
    };

    it('should throw GoneException — companies are managed in SSO', async () => {
      await expect(service.create(dto)).rejects.toThrow(GoneException);
      await expect(service.create(dto)).rejects.toThrow(SSO_MANAGE_MESSAGE);
      expect(prisma.tenant.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should include ssoCompanyId from SSO and attach matching overlay', async () => {
      companySso.listCompanies.mockResolvedValue({ data: [ssoAcme] });
      prisma.tenant.findMany.mockResolvedValue([overlayTenant()]);

      const result = await service.findAll({} as CompanyQueryDto);

      expect(companySso.listCompanies).toHaveBeenCalled();
      expect(prisma.tenant.create).not.toHaveBeenCalled();
      expect(prisma.tenant.upsert).not.toHaveBeenCalled();
      expect(result).toEqual([
        expect.objectContaining({
          id: 'tenant-1',
          ssoCompanyId: 'sso-1',
          name: 'Acme SSO',
          code: 'ACME',
          logoUrl: 'https://sso/logo.png',
          officeLatitude: -6.2,
          employeeCount: 10,
          userCount: 3,
          departmentCount: 2,
          isActive: true,
        }),
      ]);
    });

    it('should include unmatched local tenants with ssoCompanyId null', async () => {
      companySso.listCompanies.mockResolvedValue({ data: [] });
      prisma.tenant.findMany.mockResolvedValue([
        overlayTenant({ ssoCompanyId: null, name: 'Legacy Co', code: 'LEG' }),
      ]);

      const result = await service.findAll({} as CompanyQueryDto);

      expect(result).toEqual([
        expect.objectContaining({
          id: 'tenant-1',
          ssoCompanyId: null,
          name: 'Legacy Co',
          code: 'LEG',
        }),
      ]);
    });

    it('should pass search to SSO listCompanies', async () => {
      companySso.listCompanies.mockResolvedValue({ data: [] });
      prisma.tenant.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'acme' } as CompanyQueryDto);

      expect(companySso.listCompanies).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'acme', limit: 1000 }),
      );
    });

    it('should filter merged list by isActive overlay', async () => {
      companySso.listCompanies.mockResolvedValue({ data: [ssoAcme] });
      prisma.tenant.findMany.mockResolvedValue([overlayTenant({ isActive: false })]);

      const result = await service.findAll({ isActive: true } as CompanyQueryDto);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const companyId = 'tenant-1';

    it('should merge SSO identity with overlay when ssoCompanyId is set', async () => {
      prisma.tenant.findFirst.mockResolvedValue(overlayTenant());
      prisma.employee.count.mockResolvedValue(4);
      companySso.getCompanyById.mockResolvedValue(ssoAcme);

      const result = await service.findOne(companyId);

      expect(companySso.getCompanyById).toHaveBeenCalledWith('sso-1');
      expect(result).toEqual(
        expect.objectContaining({
          ssoCompanyId: 'sso-1',
          name: 'Acme SSO',
          code: 'ACME',
          logoUrl: 'https://sso/logo.png',
          officeLatitude: -6.2,
          employeeCount: 10,
          activeEmployeeCount: 4,
          userCount: 3,
          departmentCount: 2,
          leaveTypeCount: 3,
          otRuleCount: 1,
        }),
      );
    });

    it('should return overlay with ssoCompanyId null when tenant has no SSO link', async () => {
      prisma.tenant.findFirst.mockResolvedValue(
        overlayTenant({ ssoCompanyId: null, name: 'Legacy Co', code: 'LEG' }),
      );
      prisma.employee.count.mockResolvedValue(0);

      const result = await service.findOne(companyId);

      expect(companySso.getCompanyById).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          ssoCompanyId: null,
          name: 'Legacy Co',
          code: 'LEG',
        }),
      );
    });

    it('should fail-closed when SSO is down for a linked tenant', async () => {
      prisma.tenant.findFirst.mockResolvedValue(overlayTenant());
      companySso.getCompanyById.mockRejectedValue(new Error('SSO unavailable'));

      await expect(service.findOne(companyId)).rejects.toThrow('SSO unavailable');
    });

    it('should throw NotFoundException when company does not exist in local and SSO', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);
      companySso.getCompanyById.mockRejectedValue(new NotFoundException('Resource not found in SSO'));

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow('Company not found');
    });
  });

  describe('update', () => {
    const companyId = 'tenant-1';

    it('should forward name/address/phone updates to SSO when ssoCompanyId exists and update local settings', async () => {
      const companyData = overlayTenant({ ssoCompanyId: 'sso-1' });
      prisma.tenant.findFirst.mockResolvedValue(companyData);
      prisma.employee.count.mockResolvedValue(0);
      prisma.tenant.update.mockResolvedValue({
        ...companyData,
        officeLatitude: -6.21,
        currency: 'USD',
      });
      companySso.getCompanyById.mockResolvedValue(ssoAcme);
      companySso.update.mockResolvedValue({
        ...ssoAcme,
        name: 'New Company Name',
        address: 'New Address',
        phone: '08123456789',
      });

      const dto: UpdateCompanyDto = {
        name: 'New Company Name',
        address: 'New Address',
        phone: '08123456789',
        officeLatitude: -6.21,
        currency: 'USD',
      };
      const result = await service.update(companyId, dto);

      expect(companySso.update).toHaveBeenCalledWith('sso-1', {
        name: 'New Company Name',
        address: 'New Address',
        phone: '08123456789',
      });

      const updateArg = prisma.tenant.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: companyId });
      expect(updateArg.data).toEqual(
        expect.objectContaining({
          officeLatitude: -6.21,
          currency: 'USD',
          name: 'New Company Name',
          phone: '08123456789',
        }),
      );

      expect(result).toBeDefined();
    });

    it('should not call SSO update if ssoCompanyId is not present or profile fields not in dto', async () => {
      const companyData = overlayTenant({ ssoCompanyId: null });
      prisma.tenant.findFirst.mockResolvedValue(companyData);
      prisma.employee.count.mockResolvedValue(0);
      prisma.tenant.update.mockResolvedValue({ ...companyData, officeLatitude: -6.21 });

      const dto: UpdateCompanyDto = { officeLatitude: -6.21 };
      await service.update(companyId, dto);

      expect(companySso.update).not.toHaveBeenCalled();
      const updateArg = prisma.tenant.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: companyId });
      expect(updateArg.data).toEqual(expect.objectContaining({ officeLatitude: -6.21 }));
    });

    it('should throw NotFoundException if company does not exist in local and SSO', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);
      companySso.getCompanyById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { officeLatitude: 1 } as UpdateCompanyDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleStatus', () => {
    it('should throw GoneException — lifecycle belongs in SSO', async () => {
      await expect(service.toggleStatus('t1')).rejects.toThrow(GoneException);
      await expect(service.toggleStatus('t1')).rejects.toThrow(SSO_MANAGE_MESSAGE);
      expect(prisma.tenant.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw GoneException — companies are managed in SSO', async () => {
      await expect(service.remove('t1')).rejects.toThrow(GoneException);
      await expect(service.remove('t1')).rejects.toThrow(SSO_MANAGE_MESSAGE);
      expect(prisma.tenant.delete).not.toHaveBeenCalled();
    });
  });

  describe('getStatsSummary', () => {
    it('should return aggregated stats', async () => {
      prisma.tenant.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8);
      prisma.employee.count.mockResolvedValue(50);
      prisma.user.count.mockResolvedValue(20);

      const result = await service.getStatsSummary();

      expect(result).toEqual({
        totalCompanies: 10,
        activeCompanies: 8,
        inactiveCompanies: 2,
        totalEmployees: 50,
        totalUsers: 20,
      });
    });
  });
});
