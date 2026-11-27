import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { UserSsoClient } from '../../common/sso-client/user-sso.client';
import { PunchIngestService } from '../attendance/punch-ingest.service';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto } from './dto/employee.dto';
import { PunchMatchStatus, UserRole } from '@prisma/client';
import {
  assertValidEmployeeCode,
  assertValidKtpNumber,
  generateNextEmployeeCode,
  normalizeKtpNumber,
} from './employee-code.util';
import { buildEmployeeSearchWhere } from './employee-search.util';

export interface OrgNode {
  id: string;
  name: string;
  employeeCode: string;
  designation: string;
  department: string;
  email: string | null;
  children: OrgNode[];
}

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private userSso: UserSsoClient,
    @Optional() private punches?: PunchIngestService,
  ) {}

  /**
   * Kode pegawai berikutnya (awalan 9).
   */
  async getNextEmployeeCode(tenantId: string) {
    const employeeCode = await generateNextEmployeeCode(this.prisma, tenantId);
    return { employeeCode };
  }

  /**
   * Create a new employee
   */
  async create(tenantId: string, dto: CreateEmployeeDto) {
    let employeeCode = dto.employeeCode?.trim();
    if (employeeCode) {
      assertValidEmployeeCode(employeeCode);
    } else {
      employeeCode = await generateNextEmployeeCode(this.prisma, tenantId);
    }

    const ktpNumber = normalizeKtpNumber(dto.ktpNumber);
    assertValidKtpNumber(ktpNumber);

    const employeeEmail = dto.workEmail || dto.email;
    if (!employeeEmail) {
      throw new BadRequestException('Work email or email is required');
    }

    // Check if employee code, KTP, or email already exists
    const existing = await this.prisma.employee.findFirst({
      where: {
        tenantId,
        OR: [
          { employeeCode },
          { email: employeeEmail },
          ...(ktpNumber ? [{ ktpNumber }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.employeeCode === employeeCode) {
        throw new ConflictException('Employee code already exists');
      }
      if (ktpNumber && existing.ktpNumber === ktpNumber) {
        throw new ConflictException('KTP number already exists');
      }
      throw new ConflictException('Email already exists');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, ssoCompanyId: true },
    });

    let ssoUserId: string | null = null;

    if (dto.createSsoUser === true && tenant?.ssoCompanyId) {
      ssoUserId = await this.provisionSsoUser(tenantId, tenant.ssoCompanyId, {
        employeeCode,
        email: employeeEmail,
        firstName: dto.firstName,
        lastName: dto.lastName,
        departmentId: dto.departmentId,
        designationId: dto.designationId,
      });
    }

    // Create User & Employee in Prisma
    const employee = await this.prisma.$transaction(async (tx) => {
      const userRole = (dto.userRole as UserRole) || UserRole.EMPLOYEE;

      const emp = await tx.employee.create({
        data: {
          tenantId,
          ssoUserId,
          employeeCode,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: employeeEmail,
          phone: dto.phone,
          salutation: dto.salutation,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          fatherName: dto.fatherName,
          aadhaarNumber: dto.aadhaarNumber,
          ktpNumber,
          nationality: dto.nationality,
          maritalStatus: dto.maritalStatus,
          bloodGroup: dto.bloodGroup,
          mobileNumber: dto.mobileNumber,
          workEmail: dto.workEmail,
          personalEmail: dto.personalEmail,
          currentAddress: dto.currentAddress,
          currentCity: dto.currentCity,
          currentState: dto.currentState,
          currentZipCode: dto.currentZipCode,
          currentCountry: dto.currentCountry,
          permanentAddress: dto.permanentAddress,
          permanentCity: dto.permanentCity,
          permanentState: dto.permanentState,
          permanentZipCode: dto.permanentZipCode,
          permanentCountry: dto.permanentCountry,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactNumber: dto.emergencyContactNumber,
          emergencyContactRelation: dto.emergencyContactRelation,
          emergencyContactEmail: dto.emergencyContactEmail,
          monthlySalary: dto.monthlySalary,
          employmentType: dto.employmentType || 'PERMANENT',
          payType: dto.payType || 'MONTHLY',
          hourlyRate: dto.hourlyRate,
          otMultiplier: dto.otMultiplier || 1.5,
          departmentId: dto.departmentId,
          designationId: dto.designationId,
          branchId: dto.branchId,
          managerId: dto.managerId,
          joinDate: new Date(dto.joinDate),
          exitDate: dto.exitDate ? new Date(dto.exitDate) : null,
          status: dto.status || 'ACTIVE',
        },
        include: {
          department: true,
          designation: true,
          branch: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      await tx.user.create({
        data: {
          tenantId,
          email: employeeEmail,
          ssoUserId,
          role: userRole,
          employeeId: emp.id,
        },
      });

      return emp;
    });

    if (employee.email) {
      this.emailService.sendEmail({
        to: employee.email,
        subject: `Welcome to ${tenant?.name || 'the company'}!`,
        template: 'welcome',
        context: {
          firstName: employee.firstName,
          companyName: tenant?.name || 'HRMS',
          email: employee.email,
          employeeCode: employee.employeeCode,
        },
      }).catch((err) => {
        this.logger.error(`Failed to send welcome email: ${err}`);
      });
    }

    await this.rematchPunches(tenantId, employee.employeeCode);
    return employee;
  }

  /**
   * Get all employees with pagination and filters
   */
  async findAll(tenantId: string, query: EmployeeQueryDto) {
    const { search, departmentId, status, employmentType, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(departmentId && { departmentId }),
      ...(status && { status }),
      ...(employmentType && { employmentType }),
      ...(search && buildEmployeeSearchWhere(search)),
    };

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: true,
          designation: true,
          branch: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: employees,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Buat akun SSO untuk pegawai yang masih lokal.
   */
  async createSsoAccount(tenantId: string, id: string) {
    const employee = await this.findOne(tenantId, id);
    if (employee.ssoUserId || employee.user?.ssoUserId) {
      throw new ConflictException('SSO account already exists');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ssoCompanyId: true },
    });
    if (!tenant?.ssoCompanyId) {
      throw new BadRequestException('Tenant is not linked to an SSO company');
    }
    if (!/^\d{2,10}$/.test(employee.employeeCode)) {
      throw new BadRequestException(
        'Employee code must be 2–10 digits before creating SSO (use a 9-prefix HRMS code)',
      );
    }

    const email = employee.workEmail || employee.email;
    if (!email) {
      throw new BadRequestException(
        'Employee must have a work email or email before creating an SSO account',
      );
    }
    const ssoUserId = await this.provisionSsoUser(tenantId, tenant.ssoCompanyId, {
      employeeCode: employee.employeeCode,
      email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
    });

    await this.prisma.employee.update({
      where: { id },
      data: { ssoUserId },
    });

    if (employee.user) {
      await this.prisma.user.update({
        where: { id: employee.user.id },
        data: { ssoUserId },
      });
    } else {
      await this.prisma.user.create({
        data: {
          tenantId,
          email,
          ssoUserId,
          role: UserRole.EMPLOYEE,
          employeeId: id,
        },
      });
    }

    return this.findOne(tenantId, id);
  }

  private async provisionSsoUser(
    tenantId: string,
    ssoCompanyId: string,
    input: {
      employeeCode: string;
      email: string;
      firstName: string;
      lastName: string;
      departmentId?: string | null;
      designationId?: string | null;
    },
  ): Promise<string> {
    let ssoPositionId: string | null = null;
    if (input.designationId) {
      const localPos = await this.prisma.designation.findFirst({
        where: { id: input.designationId, tenantId },
      });
      ssoPositionId = localPos?.ssoPositionId ?? null;
    }

    let ssoDepartmentId: string | null = null;
    if (input.departmentId) {
      const localDept = await this.prisma.department.findFirst({
        where: { id: input.departmentId, tenantId },
      });
      ssoDepartmentId = localDept?.ssoDepartmentId ?? null;
    }

    const ssoUser = await this.userSso.create({
      email: input.email,
      name: `${input.firstName} ${input.lastName}`.trim(),
      nik: input.employeeCode,
    });

    await this.userSso.assignCompany(ssoUser.id, {
      companyId: ssoCompanyId,
      roleName: 'HRMS Employee',
    });

    if (ssoDepartmentId) {
      await this.userSso.update(ssoUser.id, { departmentId: ssoDepartmentId });
    }
    if (ssoPositionId) {
      await this.userSso.assignPosition(ssoUser.id, ssoPositionId);
    }

    return ssoUser.id;
  }

  /**
   * Get employee by ID
   */
  async findOne(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        department: true,
        designation: true,
        branch: true,
        user: {
          select: {
            id: true,
            email: true,
            ssoUserId: true,
            role: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        directReports: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            designationId: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  /**
   * Get Employee 360 view with aggregated data
   */
  async get360View(tenantId: string, id: string) {
    const employee = await this.findOne(tenantId, id);

    // Get attendance summary for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        employeeId: id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const attendanceSummary = {
      presentDays: attendanceRecords.filter((r) => r.status === 'PRESENT').length,
      absentDays: attendanceRecords.filter((r) => r.status === 'ABSENT').length,
      leaveDays: attendanceRecords.filter((r) => r.status === 'LEAVE').length,
      wfhDays: attendanceRecords.filter((r) => r.status === 'WFH').length,
      totalWorkedMinutes: attendanceRecords.reduce((sum, r) => sum + r.workedMinutes, 0),
      totalOtMinutes: attendanceRecords.reduce((sum, r) => sum + r.otMinutesCalculated, 0),
      totalApprovedOtMinutes: attendanceRecords.reduce(
        (sum, r) => sum + (r.otMinutesApproved || 0),
        0,
      ),
    };

    // Get leave balances for current year
    const leaveBalances = await this.prisma.leaveBalance.findMany({
      where: {
        tenantId,
        employeeId: id,
        year: now.getFullYear(),
      },
      include: {
        leaveType: true,
      },
    });

    // Get pending leave requests
    const pendingLeaveRequests = await this.prisma.leaveRequest.count({
      where: {
        tenantId,
        employeeId: id,
        status: 'PENDING',
      },
    });

    return {
      employee,
      attendanceSummary,
      leaveBalances,
      pendingLeaveRequests,
    };
  }

  /**
   * Update employee
   */
  async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    const employee = await this.findOne(tenantId, id);
    const previousEmployeeCode = employee.employeeCode;

    if (dto.employeeCode !== undefined) {
      const nextCode = dto.employeeCode.trim();
      if (nextCode !== employee.employeeCode) {
        assertValidEmployeeCode(nextCode);
      }
      if (nextCode !== employee.employeeCode) {
        const codeTaken = await this.prisma.employee.findFirst({
          where: { tenantId, employeeCode: nextCode, NOT: { id } },
        });
        if (codeTaken) {
          throw new ConflictException('Employee code already exists');
        }
      }
    }

    const ktpNumber =
      dto.ktpNumber !== undefined ? normalizeKtpNumber(dto.ktpNumber) : undefined;
    if (dto.ktpNumber !== undefined) {
      assertValidKtpNumber(ktpNumber ?? null);
      if (ktpNumber) {
        const ktpTaken = await this.prisma.employee.findFirst({
          where: { tenantId, ktpNumber, NOT: { id } },
        });
        if (ktpTaken) {
          throw new ConflictException('KTP number already exists');
        }
      }
    }

    // Check for email conflict if updating email
    if (dto.email) {
      const existing = await this.prisma.employee.findFirst({
        where: {
          tenantId,
          email: dto.email,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    const ssoUserId = employee.user?.ssoUserId || employee.ssoUserId;
    if (ssoUserId) {
      const ssoUserUpdates: { name?: string; departmentId?: string | null } = {};

      if (dto.firstName !== undefined || dto.lastName !== undefined) {
        ssoUserUpdates.name = `${dto.firstName ?? employee.firstName} ${dto.lastName ?? employee.lastName}`.trim();
      }

      if (dto.departmentId !== undefined) {
        if (dto.departmentId) {
          const localDept = await this.prisma.department.findFirst({
            where: { id: dto.departmentId, tenantId },
          });
          ssoUserUpdates.departmentId = localDept?.ssoDepartmentId ?? null;
        } else {
          ssoUserUpdates.departmentId = null;
        }
      }

      if (Object.keys(ssoUserUpdates).length > 0) {
        await this.userSso.update(ssoUserId, ssoUserUpdates);
      }

      if (dto.designationId !== undefined) {
        let ssoPositionId: string | null = null;
        if (dto.designationId) {
          const localPos = await this.prisma.designation.findFirst({
            where: { id: dto.designationId, tenantId },
          });
          ssoPositionId = localPos?.ssoPositionId ?? null;
        }
        await this.userSso.assignPosition(ssoUserId, ssoPositionId);
      }
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        ktpNumber: dto.ktpNumber !== undefined ? ktpNumber ?? null : undefined,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : (dto.dateOfBirth === null ? null : undefined),
        exitDate: dto.exitDate ? new Date(dto.exitDate) : (dto.exitDate === null ? null : undefined),
      },
      include: {
        department: true,
        designation: true,
        branch: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    if ((dto.status ?? updated.status) === 'ACTIVE') {
      await this.rematchPunches(tenantId, updated.employeeCode);
      if (
        dto.employeeCode &&
        dto.employeeCode.trim() !== previousEmployeeCode
      ) {
        await this.rematchPunches(tenantId, previousEmployeeCode);
      }
    }

    if (
      employee.employmentType === 'DAILY_WORKER' &&
      dto.employmentType &&
      dto.employmentType !== 'DAILY_WORKER'
    ) {
      await this.restoreMonthlySalary(tenantId, id);
    }

    return updated;
  }

  private async restoreMonthlySalary(tenantId: string, employeeId: string) {
    await this.prisma.employeeSalary.updateMany({
      where: { tenantId, employeeId, isActive: true, payBasis: 'DAILY' },
      data: { isActive: false },
    });
    const previous = await this.prisma.employeeSalary.findFirst({
      where: { tenantId, employeeId, isActive: false, payBasis: 'MONTH' },
      orderBy: { updatedAt: 'desc' },
    });
    if (!previous) return;
    await this.prisma.employeeSalary.update({
      where: { id: previous.id },
      data: { isActive: true },
    });
  }

  private async rematchPunches(tenantId: string, nik: string) {
    try {
      await this.punches?.rematch(tenantId, nik);
    } catch (error) {
      this.logger.error(`Gagal mencocokkan tap ${nik}: ${error}`);
    }
  }

  /**
   * Hapus pegawai beserta data HRMS yang menempel. Akun SSO tidak dihapus.
   */
  async remove(tenantId: string, id: string) {
    const employee = await this.findOne(tenantId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.attendancePunch.updateMany({
        where: { employeeId: id },
        data: { employeeId: null, matchStatus: PunchMatchStatus.UNMATCHED },
      });
      await tx.employee.updateMany({
        where: { managerId: id },
        data: { managerId: null },
      });
      await tx.goal.deleteMany({
        where: {
          OR: [
            { employeeId: id },
            { review: { OR: [{ employeeId: id }, { reviewerId: id }] } },
          ],
        },
      });
      await tx.leaveAccrualEntry.deleteMany({ where: { employeeId: id } });
      await tx.leaveBalance.deleteMany({ where: { employeeId: id } });
      await tx.leaveRequest.deleteMany({ where: { employeeId: id } });
      await tx.attendanceRecord.deleteMany({ where: { employeeId: id } });
      await tx.attendanceRegularization.deleteMany({ where: { employeeId: id } });
      await tx.compOffRequest.deleteMany({ where: { employeeId: id } });
      await tx.employeeChangeRequest.deleteMany({ where: { employeeId: id } });
      await tx.employeeDocument.deleteMany({ where: { employeeId: id } });
      await tx.employeeSalary.deleteMany({ where: { employeeId: id } });
      await tx.expenseClaim.deleteMany({ where: { employeeId: id } });
      await tx.feedback.deleteMany({
        where: { OR: [{ senderId: id }, { receiverId: id }] },
      });
      await tx.improvementPlan.deleteMany({
        where: { OR: [{ employeeId: id }, { managerId: id }] },
      });
      await tx.letterGenerated.deleteMany({ where: { employeeId: id } });
      await tx.onboardingProcess.deleteMany({ where: { employeeId: id } });
      await tx.payslip.deleteMany({ where: { employeeId: id } });
      await tx.performanceReview.deleteMany({
        where: { OR: [{ employeeId: id }, { reviewerId: id }] },
      });
      await tx.separation.deleteMany({ where: { employeeId: id } });
      await tx.shiftAssignment.deleteMany({ where: { employeeId: id } });
      await tx.announcement.deleteMany({ where: { authorId: id } });
      await tx.employee.delete({ where: { id } });

      if (employee.user) {
        await tx.notification.deleteMany({ where: { userId: employee.user.id } });
        await tx.user.delete({ where: { id: employee.user.id } });
      }
    });

    return { success: true, message: 'Employee deleted successfully' };
  }

  /**
   * Get employees managed by a specific manager
   */
  async getDirectReports(tenantId: string, managerId: string) {
    return this.prisma.employee.findMany({
      where: {
        tenantId,
        managerId,
        status: 'ACTIVE',
      },
      include: {
        department: true,
      },
    });
  }

  /**
   * Get org chart tree structure — all active employees with hierarchy
   */
  async getOrgChart(tenantId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        designationId: true,
        designation: {
          select: {
            id: true,
            name: true,
            code: true,
            level: true,
            parentId: true,
          },
        },
        department: { select: { id: true, name: true, code: true } },
        managerId: true,
        email: true,
      },
      orderBy: [{ employeeCode: 'asc' }, { firstName: 'asc' }],
    });

    const levelPriority: Record<string, number> = {
      COMPANY: 1,
      DIVISION: 2,
      DEPARTMENT: 3,
    };

    // Build position -> employees map to resolve manager if managerId is not explicitly set
    const empByDesignation = new Map<string, string[]>();
    for (const emp of employees) {
      if (emp.designationId) {
        if (!empByDesignation.has(emp.designationId)) {
          empByDesignation.set(emp.designationId, []);
        }
        empByDesignation.get(emp.designationId)!.push(emp.id);
      }
    }

    const nodeMap = new Map<string, OrgNode & { level?: string; code?: string }>();
    for (const emp of employees) {
      nodeMap.set(emp.id, {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        employeeCode: emp.employeeCode,
        designation: emp.designation?.name || '',
        department: emp.department?.name || '',
        email: emp.email,
        level: emp.designation?.level || 'DEPARTMENT',
        code: emp.employeeCode,
        children: [],
      });
    }

    const roots: (OrgNode & { level?: string; code?: string })[] = [];
    for (const emp of employees) {
      const node = nodeMap.get(emp.id)!;
      let effectiveManagerId = emp.managerId;

      // If no explicit managerId, fallback to parent position's employee (if any)
      if (!effectiveManagerId && emp.designation?.parentId) {
        const parentDesignationId = emp.designation.parentId;
        const parentEmps = empByDesignation.get(parentDesignationId);
        if (parentEmps && parentEmps.length > 0) {
          // Attach to the first employee holding the parent position
          effectiveManagerId = parentEmps[0];
        }
      }

      if (effectiveManagerId && nodeMap.has(effectiveManagerId) && effectiveManagerId !== emp.id) {
        nodeMap.get(effectiveManagerId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortTree = (list: (OrgNode & { level?: string; code?: string })[]) => {
      list.sort((a, b) => {
        const pA = levelPriority[a.level || ''] || 99;
        const pB = levelPriority[b.level || ''] || 99;
        if (pA !== pB) return pA - pB;
        return (a.code || '').localeCompare(b.code || '');
      });
      list.forEach((item) => {
        if (item.children && item.children.length > 0) {
          sortTree(item.children as (OrgNode & { level?: string; code?: string })[]);
        }
      });
    };

    sortTree(roots);

    return roots;
  }
}
