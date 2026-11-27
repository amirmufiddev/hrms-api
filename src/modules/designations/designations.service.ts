import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PositionLevel, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DepartmentsService } from '../departments/departments.service';
import {
  CreateDesignationDto,
  UpdateDesignationDto,
} from './dto/designation.dto';
import {
  PositionSsoClient,
  SsoPositionItem,
} from '../../common/sso-client/position-sso.client';
import { inferUnparentedPositionLinks } from './infer-position-links';

@Injectable()
export class DesignationsService {
  private readonly logger = new Logger(DesignationsService.name);

  constructor(
    private prisma: PrismaService,
    private positionSso: PositionSsoClient,
    private departments: DepartmentsService,
  ) {}

  resolvePositionLevel(
    departmentId?: string | null,
    classification?: string | null,
  ): PositionLevel {
    if (!departmentId) {
      return PositionLevel.COMPANY;
    }
    if (classification === 'DIVISION') {
      return PositionLevel.DIVISION;
    }
    return PositionLevel.DEPARTMENT;
  }

  async create(tenantId: string, dto: CreateDesignationDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ssoCompanyId: true },
    });

    let localDeptClassification: string | null = null;
    let ssoDeptId: string | null = null;
    if (dto.departmentId) {
      const localDept = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, tenantId },
      });
      ssoDeptId = localDept?.ssoDepartmentId ?? null;
      localDeptClassification = localDept?.classification ?? null;
    }

    const level =
      dto.level ||
      this.resolvePositionLevel(dto.departmentId, localDeptClassification);

    let ssoPositionId: string | undefined = undefined;

    if (tenant?.ssoCompanyId) {
      let ssoParentId: string | null = null;
      if (dto.parentId) {
        const localParent = await this.prisma.designation.findFirst({
          where: { id: dto.parentId, tenantId },
        });
        ssoParentId = localParent?.ssoPositionId ?? null;
      }

      const ssoRes = await this.positionSso.create({
        name: dto.name,
        code: dto.code,
        companyId: tenant.ssoCompanyId,
        departmentId: ssoDeptId,
        parentId: ssoParentId,
        description: dto.description,
      });
      ssoPositionId = ssoRes.id;
    }

    return this.prisma.designation.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        departmentId: dto.departmentId,
        parentId: dto.parentId,
        level,
        ...(ssoPositionId ? { ssoPositionId } : {}),
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateDesignationDto) {
    const designation = await this.prisma.designation.findFirst({
      where: { id, tenantId },
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    let calculatedLevel: PositionLevel | undefined = undefined;
    let localDeptClassification: string | null = null;

    if (dto.level !== undefined) {
      calculatedLevel = dto.level;
    } else if (dto.departmentId !== undefined) {
      if (dto.departmentId) {
        const localDept = await this.prisma.department.findFirst({
          where: { id: dto.departmentId, tenantId },
        });
        localDeptClassification = localDept?.classification ?? null;
        calculatedLevel = this.resolvePositionLevel(
          dto.departmentId,
          localDeptClassification,
        );
      } else {
        calculatedLevel = this.resolvePositionLevel(null, null);
      }
    }

    if (designation.ssoPositionId) {
      let ssoDeptId: string | null | undefined = undefined;
      if (dto.departmentId !== undefined) {
        if (dto.departmentId) {
          const localDept = await this.prisma.department.findFirst({
            where: { id: dto.departmentId, tenantId },
          });
          ssoDeptId = localDept?.ssoDepartmentId ?? null;
        } else {
          ssoDeptId = null;
        }
      }

      let ssoParentId: string | null | undefined = undefined;
      if (dto.parentId !== undefined) {
        if (dto.parentId) {
          const localParent = await this.prisma.designation.findFirst({
            where: { id: dto.parentId, tenantId },
          });
          ssoParentId = localParent?.ssoPositionId ?? null;
        } else {
          ssoParentId = null;
        }
      }

      await this.positionSso.update(designation.ssoPositionId, {
        name: dto.name,
        code: dto.code,
        departmentId: ssoDeptId,
        parentId: ssoParentId,
        description: dto.description,
      });
    }

    return this.prisma.designation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(calculatedLevel !== undefined ? { level: calculatedLevel } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const designation = await this.prisma.designation.findFirst({
      where: { id, tenantId },
      include: {
        children: { select: { id: true } },
        employees: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
      },
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    if (designation.children.length > 0 || designation.employees.length > 0) {
      throw new BadRequestException(
        'Cannot delete designation with active employees or sub-units',
      );
    }

    if (designation.ssoPositionId) {
      await this.positionSso.delete(designation.ssoPositionId);
    }

    await this.prisma.designation.delete({
      where: { id },
    });

    return { success: true, message: 'Designation deleted successfully' };
  }

  /**
   * Refresh local Designation cache from SSO. No-op when the tenant is not
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

      // Try fetching full tree from SSO first, fallback to listByCompany
      let ssoRows: Array<{
        id: string;
        code: string | null;
        name: string;
        companyId: string;
        departmentId: string | null;
        parentId: string | null;
        description: string | null;
        level?: 'COMPANY' | 'DIVISION' | 'DEPARTMENT';
      }> = [];

      try {
        const treeNodes = await this.positionSso.getTree(tenant.ssoCompanyId);
        if (treeNodes && treeNodes.length > 0) {
          const flattenSsoTree = (nodes: typeof treeNodes): typeof ssoRows => {
            const list: typeof ssoRows = [];
            const walk = (items: typeof treeNodes, parentId: string | null) => {
              for (const item of items) {
                list.push({
                  id: item.id,
                  code: item.code,
                  name: item.name,
                  companyId: item.companyId,
                  departmentId: item.departmentId ?? null,
                  parentId: item.parentId ?? parentId,
                  description: item.description ?? null,
                  level: item.level,
                });
                if (item.children && item.children.length > 0) {
                  walk(item.children, item.id);
                }
              }
            };
            walk(nodes, null);
            return list;
          };
          ssoRows = flattenSsoTree(treeNodes);
        }
      } catch (treeErr) {
        this.logger.debug(
          `SSO getTree failed, falling back to listByCompany: ${(treeErr as Error)?.message ?? treeErr}`,
        );
      }

      if (ssoRows.length === 0) {
        ssoRows = await this.positionSso.listByCompany(tenant.ssoCompanyId);
      }
      const localBySsoId = new Map<string, string>();

      // Pre-map SSO department IDs to local Department IDs and classifications
      const localDepartments = await this.prisma.department.findMany({
        where: { tenantId },
        select: { id: true, ssoDepartmentId: true, classification: true },
      });
      const localDeptBySsoDeptId = new Map<string, { id: string; classification: string | null }>();
      for (const d of localDepartments) {
        if (d.ssoDepartmentId) {
          localDeptBySsoDeptId.set(d.ssoDepartmentId, {
            id: d.id,
            classification: d.classification,
          });
        }
      }

      // Pass 1: Upsert basic position data without parent
      for (const sso of ssoRows) {
        const localDeptInfo = sso.departmentId
          ? (localDeptBySsoDeptId.get(sso.departmentId) ?? null)
          : null;
        const localDeptId = localDeptInfo?.id ?? null;
        const deptClassification = localDeptInfo?.classification ?? null;
        const level =
          (sso.level as PositionLevel) ||
          this.resolvePositionLevel(localDeptId, deptClassification);

        const local = await this.upsertWithoutParent(
          tenantId,
          sso,
          localDeptId,
          level,
        );
        localBySsoId.set(sso.id, local.id);
      }

      // Pass 2: Connect parent relationships
      for (const sso of ssoRows) {
        const localId = localBySsoId.get(sso.id);
        if (!localId) {
          continue;
        }
        const parentId = sso.parentId
          ? (localBySsoId.get(sso.parentId) ?? null)
          : null;
        await this.prisma.designation.update({
          where: { id: localId },
          data: { parentId },
        });
      }

      await this.linkUnparentedPositions(tenantId);
    } catch (error) {
      this.logger.warn(
        `Failed to sync positions from SSO for tenant ${tenantId}: ${(error as Error)?.message ?? error}. Serving existing local cache.`,
      );
      if (options?.strict) {
        throw error;
      }
    }
  }

  /**
   * Tarik departemen dan jabatan dari API SSO.
   */
  async syncOrgFromSso(tenantId: string) {
    await this.departments.syncFromSso(tenantId, { strict: true });
    await this.syncFromSso(tenantId, { strict: true });

    const [departmentCount, positionCount] = await Promise.all([
      this.prisma.department.count({ where: { tenantId } }),
      this.prisma.designation.count({ where: { tenantId } }),
    ]);

    return {
      departments: departmentCount,
      positions: positionCount,
    };
  }

  async findAll(tenantId: string) {
    await this.syncFromSso(tenantId);

    return this.prisma.designation.findMany({
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
  }

  async getTree(tenantId: string) {
    await this.syncFromSso(tenantId);

    const allDesignations = await this.prisma.designation.findMany({
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

    const sortNodes = <T extends { code?: string | null; name: string }>(
      nodes: T[],
    ): T[] => {
      return [...nodes].sort((a, b) => {
        const codeA = a.code || '';
        const codeB = b.code || '';
        if (codeA !== codeB) return codeA.localeCompare(codeB);
        return a.name.localeCompare(b.name);
      });
    };

    const buildTree = (
      items: typeof allDesignations,
      parentId: string | null = null,
    ): any[] => {
      const filtered = items.filter(
        (item) => (item.parentId ?? null) === parentId,
      );
      const sorted = sortNodes(filtered);
      return sorted.map((item) => ({
        ...item,
        children: buildTree(items, item.id),
      }));
    };

    const departments = await this.prisma.department.findMany({
      where: { tenantId },
      select: { id: true, parentId: true, classification: true },
    });
    const links = new Map(
      inferUnparentedPositionLinks(
        Array.isArray(departments) ? departments : [],
        allDesignations.map((item) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          parentId: item.parentId,
          departmentId: item.departmentId,
        })),
      ).map((link) => [link.id, link.parentId]),
    );

    const linkedOnly = allDesignations.some((d) => d.ssoPositionId)
      ? allDesignations.filter((d) => d.ssoPositionId)
      : allDesignations;
    const shaped = linkedOnly.map((item) =>
      links.has(item.id) ? { ...item, parentId: links.get(item.id) ?? null } : item,
    );

    return buildTree(shaped, null);
  }

  /**
   * Simpan relasi yang disimpulkan agar daftar jabatan di luar bagan ikut terhubung.
   * Sync berikutnya menimpa parent dari SSO, lalu menghitung ulang relasi ini.
   */
  private async linkUnparentedPositions(tenantId: string) {
    const [departments, designations] = await Promise.all([
      this.prisma.department.findMany({
        where: { tenantId },
        select: { id: true, parentId: true, classification: true },
      }),
      this.prisma.designation.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          code: true,
          parentId: true,
          departmentId: true,
        },
      }),
    ]);
    const links = inferUnparentedPositionLinks(
      Array.isArray(departments) ? departments : [],
      Array.isArray(designations) ? designations : [],
    );
    for (const link of links) {
      await this.prisma.designation.update({
        where: { id: link.id },
        data: { parentId: link.parentId },
      });
    }
  }

  async findOne(tenantId: string, id: string) {
    const designation = await this.prisma.designation.findFirst({
      where: { id, tenantId },
      include: {
        parent: true,
        children: true,
        department: {
          include: {
            parent: true,
          },
        },
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        },
        _count: { select: { employees: true } },
      },
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    return designation;
  }

  private async upsertWithoutParent(
    tenantId: string,
    sso: SsoPositionItem,
    departmentId: string | null,
    level: PositionLevel,
  ): Promise<{ id: string }> {
    const baseCode = sso.code?.trim() || `POS-${sso.id.slice(0, 6)}`;
    try {
      return await this.writeUpsert(
        tenantId,
        sso,
        baseCode,
        sso.name,
        departmentId,
        level,
      );
    } catch (error) {
      if (!isUniqueConflict(error)) {
        throw error;
      }
      return this.recoverNameConflict(
        tenantId,
        sso,
        baseCode,
        departmentId,
        level,
      );
    }
  }

  /**
   * `@@unique([tenantId, name])` bentrok karena beberapa jabatan SSO memakai
   * nama yang sama. Baris lokal yang belum terhubung diambil alih; jika nama
   * sudah milik jabatan SSO lain, simpan dengan kode sebagai pembeda.
   */
  private async recoverNameConflict(
    tenantId: string,
    sso: SsoPositionItem,
    code: string,
    departmentId: string | null,
    level: PositionLevel,
  ): Promise<{ id: string }> {
    const existing = await this.prisma.designation.findUnique({
      where: { tenantId_name: { tenantId, name: sso.name } },
      select: { id: true, ssoPositionId: true },
    });

    if (
      existing &&
      (existing.ssoPositionId == null || existing.ssoPositionId === sso.id)
    ) {
      return this.prisma.designation.update({
        where: { id: existing.id },
        data: {
          code,
          ssoPositionId: sso.id,
          departmentId,
          level,
        },
      });
    }

    const disambiguated = `${sso.name} (${code})`;
    try {
      return await this.writeUpsert(
        tenantId,
        sso,
        code,
        disambiguated,
        departmentId,
        level,
      );
    } catch (error) {
      if (!isUniqueConflict(error)) {
        throw error;
      }
      return this.writeUpsert(
        tenantId,
        sso,
        code,
        `${sso.name} (${sso.id.slice(0, 8)})`,
        departmentId,
        level,
      );
    }
  }

  private writeUpsert(
    tenantId: string,
    sso: SsoPositionItem,
    code: string,
    name: string,
    departmentId: string | null,
    level: PositionLevel,
  ) {
    return this.prisma.designation.upsert({
      where: { ssoPositionId: sso.id },
      create: {
        tenantId,
        name,
        code,
        ssoPositionId: sso.id,
        departmentId,
        level,
      },
      update: {
        name,
        code,
        departmentId,
        level,
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
