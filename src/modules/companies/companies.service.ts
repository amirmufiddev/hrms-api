import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { CompanySsoClient, SsoCompanyItem } from '../../common/sso-client/company-sso.client';
import { CreateCompanyDto, UpdateCompanyDto, CompanyQueryDto } from './dto/company.dto';

const SSO_MANAGE_MESSAGE = 'Manage companies in SSO';

function shortHex(id: string, length = 8): string {
  return id.replace(/-/g, '').slice(0, length);
}

type TenantCountSlice = {
  employees: number;
  users: number;
  departments: number;
  leaveTypes?: number;
  otRules?: number;
};

type TenantOverlay = {
  id: string;
  name: string;
  code: string;
  ssoCompanyId: string | null;
  isActive: boolean;
  logoUrl: string | null;
  officeLatitude: number | null;
  officeLongitude: number | null;
  officeRadiusMeters: number | null;
  _count?: TenantCountSlice;
  [key: string]: unknown;
};

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private companySso: CompanySsoClient,
  ) {}

  /**
   * Company identity is managed in SSO — HRMS no longer creates tenants here.
   */
  async create(_dto: CreateCompanyDto) {
    throw new GoneException(SSO_MANAGE_MESSAGE);
  }

  /**
   * Get all companies: SSO identity + local overlay (no mass-create).
   */
  async findAll(query: CompanyQueryDto) {
    const { search, isActive } = query;

    let ssoItems: SsoCompanyItem[] = [];
    try {
      const ssoResponse = await this.companySso.listCompanies({
        ...(search ? { search } : {}),
        limit: 1000,
      });
      ssoItems = ssoResponse.data ?? [];
    } catch {
      ssoItems = [];
    }

    const tenants = (await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            employees: true,
            users: true,
            departments: true,
          },
        },
      },
    })) as TenantOverlay[];

    const overlayBySsoId = new Map<string, TenantOverlay>();
    const unmatched: TenantOverlay[] = [];
    for (const tenant of tenants) {
      if (tenant.ssoCompanyId) {
        overlayBySsoId.set(tenant.ssoCompanyId, tenant);
      } else {
        unmatched.push(tenant);
      }
    }

    const fromSso = ssoItems.map((sso) => {
      const tenant = overlayBySsoId.get(sso.id) ?? null;
      return this.toListItem(sso, tenant);
    });

    const fromUnmatched = unmatched
      .filter((tenant) => this.matchesSearch(tenant, search))
      .map((tenant) => this.toListItem(null, tenant));

    let result = [...fromSso, ...fromUnmatched];

    if (isActive !== undefined) {
      result = result.filter((item) => item.isActive === isActive);
    }

    return result;
  }

  /**
   * Get company by local tenant ID or SSO company ID with SSO identity merged when linked.
   */
  async findOne(id: string) {
    const company = (await this.prisma.tenant.findFirst({
      where: {
        OR: [{ id }, { ssoCompanyId: id }],
      },
      include: {
        _count: {
          select: {
            employees: true,
            users: true,
            departments: true,
            leaveTypes: true,
            otRules: true,
          },
        },
      },
    })) as TenantOverlay | null;

    let sso: SsoCompanyItem | null = null;
    if (company?.ssoCompanyId) {
      sso = await this.companySso.getCompanyById(company.ssoCompanyId);
    } else if (!company) {
      try {
        sso = await this.companySso.getCompanyById(id);
      } catch {
        throw new NotFoundException('Company not found');
      }
      if (!sso) {
        throw new NotFoundException('Company not found');
      }
    }

    const activeEmployees = company
      ? await this.prisma.employee.count({
          where: { tenantId: company.id, status: 'ACTIVE' },
        })
      : 0;

    return {
      ...this.mergeSsoOverlay(sso, company),
      employeeCount: company?._count?.employees ?? 0,
      activeEmployeeCount: activeEmployees,
      userCount: company?._count?.users ?? 0,
      departmentCount: company?._count?.departments ?? 0,
      leaveTypeCount: company?._count?.leaveTypes ?? 0,
      otRuleCount: company?._count?.otRules ?? 0,
      _count: undefined,
    };
  }

  /**
   * Update company settings and forward profile updates to SSO when linked.
   */
  async update(id: string, dto: UpdateCompanyDto) {
    let existing = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ id }, { ssoCompanyId: id }],
      },
    });

    if (!existing) {
      const ssoCompany = await this.companySso.getCompanyById(id);
      if (!ssoCompany) {
        throw new NotFoundException('Company not found');
      }
      const short = shortHex(ssoCompany.id);
      let code = ssoCompany.code?.trim() || short;
      const codeClash = await this.prisma.tenant.findUnique({ where: { code } });
      if (codeClash) {
        code = `${code}-${short}`;
      }
      existing = await this.prisma.tenant.create({
        data: {
          name: ssoCompany.name,
          code,
          ssoCompanyId: ssoCompany.id,
          logoUrl: ssoCompany.logo ?? null,
        },
      });
    }

    if (existing.ssoCompanyId && (dto.name !== undefined || dto.address !== undefined || dto.phone !== undefined)) {
      await this.companySso.update(existing.ssoCompanyId, {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      });
    }

    const overlayData = this.overlayFieldsOnly(dto);

    await this.prisma.tenant.update({
      where: { id: existing.id },
      data: overlayData,
    });

    return this.findOne(existing.id);
  }

  /**
   * Company lifecycle is managed in SSO.
   */
  async toggleStatus(_id: string) {
    throw new GoneException(SSO_MANAGE_MESSAGE);
  }

  /**
   * Company identity is managed in SSO — HRMS no longer deletes tenants here.
   */
  async remove(_id: string) {
    throw new GoneException(SSO_MANAGE_MESSAGE);
  }

  /**
   * Upload company logo: delete old file, store new key, return key
   */
  async uploadLogo(id: string, file: Express.Multer.File) {
    let existing = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ id }, { ssoCompanyId: id }],
      },
      select: { id: true, logoUrl: true },
    });

    if (!existing) {
      const ssoCompany = await this.companySso.getCompanyById(id);
      if (!ssoCompany) {
        throw new NotFoundException('Company not found');
      }
      const short = shortHex(ssoCompany.id);
      let code = ssoCompany.code?.trim() || short;
      const codeClash = await this.prisma.tenant.findUnique({ where: { code } });
      if (codeClash) {
        code = `${code}-${short}`;
      }
      existing = await this.prisma.tenant.create({
        data: {
          name: ssoCompany.name,
          code,
          ssoCompanyId: ssoCompany.id,
          logoUrl: ssoCompany.logo ?? null,
        },
        select: { id: true, logoUrl: true },
      });
    }

    if (
      existing.logoUrl &&
      !existing.logoUrl.startsWith('http://') &&
      !existing.logoUrl.startsWith('https://')
    ) {
      await this.storage.delete(existing.logoUrl).catch(() => {});
    }

    const uploaded = await this.storage.upload(file, 'company_logo', existing.id);

    await this.prisma.tenant.update({
      where: { id: existing.id },
      data: { logoUrl: uploaded.key },
    });

    return { logoUrl: uploaded.key };
  }

  /**
   * Get company statistics summary
   */
  async getStatsSummary() {
    const [totalCompanies, activeCompanies, totalEmployees, totalUsers] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { isActive: true } }),
        this.prisma.employee.count(),
        this.prisma.user.count(),
      ]);

    return {
      totalCompanies,
      activeCompanies,
      inactiveCompanies: totalCompanies - activeCompanies,
      totalEmployees,
      totalUsers,
    };
  }

  private overlayFieldsOnly(dto: UpdateCompanyDto): UpdateCompanyDto {
    const { ...overlay } = dto;
    delete (overlay as { code?: string }).code;
    delete (overlay as { address?: string }).address;
    return overlay;
  }

  private matchesSearch(
    tenant: { name?: string | null; code?: string | null },
    search?: string,
  ): boolean {
    if (!search?.trim()) {
      return true;
    }
    const q = search.trim().toLowerCase();
    const name = tenant.name?.toLowerCase() ?? '';
    const code = tenant.code?.toLowerCase() ?? '';
    return name.includes(q) || code.includes(q);
  }

  private toListItem(sso: SsoCompanyItem | null, tenant: TenantOverlay | null) {
    const counts = tenant?._count
      ? {
          employeeCount: tenant._count.employees,
          userCount: tenant._count.users,
          departmentCount: tenant._count.departments,
        }
      : {
          employeeCount: 0,
          userCount: 0,
          departmentCount: 0,
        };

    return {
      ...this.mergeSsoOverlay(sso, tenant),
      ...counts,
      _count: undefined,
    };
  }

  private mergeSsoOverlay(sso: SsoCompanyItem | null, tenant: TenantOverlay | null) {
    const overlay = tenant ? { ...tenant } : {};
    delete (overlay as { _count?: TenantCountSlice })._count;

    if (!sso) {
      return {
        ...overlay,
        id: tenant?.id ?? null,
        ssoCompanyId: tenant?.ssoCompanyId ?? null,
        name: tenant?.name ?? '',
        code: tenant?.code ?? '',
        logoUrl: tenant?.logoUrl ?? null,
        officeLatitude: tenant?.officeLatitude ?? null,
        officeLongitude: tenant?.officeLongitude ?? null,
        officeRadiusMeters: tenant?.officeRadiusMeters ?? null,
        isActive: tenant?.isActive ?? true,
      };
    }

    return {
      ...overlay,
      id: tenant?.id ?? sso.id,
      ssoCompanyId: sso.id,
      name: sso.name,
      code: sso.code,
      logoUrl: sso.logo ?? tenant?.logoUrl ?? null,
      officeLatitude: tenant?.officeLatitude ?? null,
      officeLongitude: tenant?.officeLongitude ?? null,
      officeRadiusMeters: tenant?.officeRadiusMeters ?? null,
      isActive: tenant?.isActive ?? true,
    };
  }
}
