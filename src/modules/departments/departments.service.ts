import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import {
  DepartmentSsoClient,
  SsoDepartmentItem,
} from '../../common/sso-client/department-sso.client';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(
    private prisma: PrismaService,
    private departmentSso: DepartmentSsoClient,
  ) {}

  async create(tenantId: string, dto: CreateDepartmentDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ssoCompanyId: true },
    });

    let ssoDepartmentId: string | undefined = undefined;

    if (tenant?.ssoCompanyId) {
      let ssoParentId: string | null = null;
      if (dto.parentId) {
        const parentDept = await this.prisma.department.findFirst({
          where: { id: dto.parentId, tenantId },
        });
        ssoParentId = parentDept?.ssoDepartmentId ?? null;
      }

      const ssoRes = await this.departmentSso.create({
        name: dto.name,
        code: dto.code,
        companyId: tenant.ssoCompanyId,
        parentId: ssoParentId,
        classification: dto.classification as any,
        description: dto.description,
      });
      ssoDepartmentId = ssoRes.id;
    }

    return this.prisma.department.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        parentId: dto.parentId,
        classification: dto.classification,
        description: dto.description,
        ...(ssoDepartmentId ? { ssoDepartmentId } : {}),
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findFirst({
      where: { id, tenantId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    if (department.ssoDepartmentId) {
      let ssoParentId: string | null | undefined = undefined;
      if (dto.parentId !== undefined) {
        if (dto.parentId) {
          const parentDept = await this.prisma.department.findFirst({
            where: { id: dto.parentId, tenantId },
          });
          ssoParentId = parentDept?.ssoDepartmentId ?? null;
        } else {
          ssoParentId = null;
        }
      }

      await this.departmentSso.update(department.ssoDepartmentId, {
        name: dto.name,
        code: dto.code,
        parentId: ssoParentId,
        classification: dto.classification as any,
        description: dto.description,
      });
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.classification !== undefined
          ? { classification: dto.classification }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, tenantId },
      include: {
        children: { select: { id: true } },
        employees: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    if (department.children.length > 0 || department.employees.length > 0) {
      throw new BadRequestException(
        'Cannot delete department with active employees or sub-units',
      );
    }

    if (department.ssoDepartmentId) {
      await this.departmentSso.delete(department.ssoDepartmentId);
    }

    await this.prisma.department.delete({
      where: { id },
    });

    return { success: true, message: 'Department deleted successfully' };
  }

  /**
   * Refresh local Department cache from SSO. No-op when the tenant is not
   * linked (`ssoCompanyId` missing). Graceful degradation on SSO failure.
   */
  async syncFromSso(
    tenantId: string,
    options?: { strict?: boolean },
  ): Promise<void> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { ssoCompanyId: true },
      });
      if (!tenant?.ssoCompanyId) {
        if (options?.strict) {
          throw new BadRequestException('Perusahaan belum terhubung ke SSO');
        }
        return;
      }

      const ssoRows = await this.departmentSso.listByCompany(tenant.ssoCompanyId);
      const localBySsoId = new Map<string, string>();

      for (const sso of ssoRows) {
        const local = await this.upsertWithoutParent(tenantId, sso);
        localBySsoId.set(sso.id, local.id);
      }

      for (const sso of ssoRows) {
        const localId = localBySsoId.get(sso.id);
        if (!localId) {
          continue;
        }
        const parentId = sso.parentId
          ? (localBySsoId.get(sso.parentId) ?? null)
          : null;
        await this.prisma.department.update({
          where: { id: localId },
          data: { parentId },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to sync departments from SSO for tenant ${tenantId}: ${(error as Error)?.message ?? error}. Serving existing local cache.`,
      );
      if (options?.strict) {
        throw error;
      }
    }
  }

  async findAll(tenantId: string) {
    await this.syncFromSso(tenantId);

    return this.prisma.department.findMany({
      where: { tenantId },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getHierarchy(tenantId: string) {
    await this.syncFromSso(tenantId);

    return this.prisma.department.findMany({
      where: { tenantId, parentId: null },
      include: {
        children: {
          include: {
            children: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
      orderBy: [
        { classification: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(tenantId: string, id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, tenantId },
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
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  private async upsertWithoutParent(
    tenantId: string,
    sso: SsoDepartmentItem,
  ): Promise<{ id: string }> {
    const baseCode = sso.code?.trim() || `SSO-${sso.id.slice(0, 6)}`;
    try {
      return await this.writeUpsert(tenantId, sso, baseCode);
    } catch (error) {
      if (!isUniqueConflict(error)) {
        throw error;
      }
      return this.writeUpsert(tenantId, sso, `${baseCode}-${sso.id.slice(0, 6)}`);
    }
  }

  private writeUpsert(tenantId: string, sso: SsoDepartmentItem, code: string) {
    return this.prisma.department.upsert({
      where: { ssoDepartmentId: sso.id },
      create: {
        tenantId,
        name: sso.name,
        code,
        ssoDepartmentId: sso.id,
        classification: sso.classification,
        description: sso.description,
      },
      update: {
        name: sso.name,
        code,
        classification: sso.classification,
        description: sso.description,
      },
    });
  }
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
