import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';
import {
  CreateCompOffDto,
  ApproveCompOffDto,
  CompOffQueryDto,
} from './dto/comp-off.dto';
import {
  HrmsApprovalOrchestrator,
  HRMS_APPROVAL_MODULE,
} from '../../common/sso-client/hrms-approval.orchestrator';

@Injectable()
export class CompOffService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private approvals: HrmsApprovalOrchestrator,
  ) {}

  /**
   * Create a comp-off request
   */
  async create(tenantId: string, employeeId: string, dto: CreateCompOffDto) {
    const workedDate = new Date(dto.workedDate);

    // Validate that the worked date is not in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (workedDate > today) {
      throw new BadRequestException('Worked date cannot be in the future');
    }

    // Validate: must be a weekend or holiday date
    const dayOfWeek = workedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Check if the date is a holiday
    const holiday = await this.prisma.holiday.findFirst({
      where: {
        tenantId,
        date: workedDate,
        isActive: true,
      },
    });

    if (!isWeekend && !holiday) {
      throw new BadRequestException(
        'Comp-off can only be requested for weekends or holidays',
      );
    }

    // Check for duplicate request
    const existing = await this.prisma.compOffRequest.findUnique({
      where: {
        tenantId_employeeId_workedDate: {
          tenantId,
          employeeId,
          workedDate,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'A comp-off request already exists for this date',
      );
    }

    // Set expiry date (90 days from worked date)
    const expiryDate = new Date(workedDate);
    expiryDate.setDate(expiryDate.getDate() + 90);

    const request = await this.prisma.compOffRequest.create({
      data: {
        tenantId,
        employeeId,
        workedDate,
        reason: dto.reason,
        earnedDays: dto.earnedDays || 1.0,
        expiryDate,
        status: 'PENDING',
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    const instanceId = await this.approvals.submitIfLinked({
      tenantId,
      moduleKey: HRMS_APPROVAL_MODULE.COMP_OFF,
      recordId: request.id,
      recordNumber: `CO-${request.id.slice(0, 8).toUpperCase()}`,
      recordAmount: Number(request.earnedDays),
      submittedByEmployeeId: employeeId,
      contextData: {
        earnedDays: Number(request.earnedDays),
        isWeekend,
        isHoliday: Boolean(holiday),
        department: { name: request.employee?.department?.name ?? null },
        workedDate: request.workedDate,
        reason: dto.reason,
      },
    });

    if (instanceId) {
      await this.prisma.compOffRequest.update({
        where: { id: request.id },
        data: { approvalRequestId: instanceId },
      });
      (request as any).approvalRequestId = instanceId;
    }

    return request;
  }

  /**
   * Get my comp-off requests (paginated)
   */
  async getMyRequests(
    tenantId: string,
    employeeId: string,
    query: CompOffQueryDto,
  ) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      employeeId,
    };

    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      this.prisma.compOffRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.compOffRequest.count({ where }),
    ]);

    await this.approvals.enrichCurrentApproval(requests, ['PENDING']);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get pending approvals
   * HR_ADMIN and SUPER_ADMIN see all pending in tenant; managers see direct reports only
   */
  async getPendingApprovals(
    tenantId: string,
    managerId: string,
    role?: string,
  ) {
    const where: any = {
      tenantId,
      status: 'PENDING' as const,
    };

    if (role === 'MANAGER') {
      const directReports = await this.prisma.employee.findMany({
        where: { tenantId, managerId, status: 'ACTIVE' },
        select: { id: true },
      });
      where.employeeId = { in: directReports.map((e) => e.id) };
    }

    const requests = await this.prisma.compOffRequest.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    await this.approvals.enrichCurrentApproval(requests, ['PENDING']);

    return requests;
  }

  /**
   * Approve a comp-off request
   */
  async approve(
    tenantId: string,
    id: string,
    approverId: string,
    approverRole: string,
    dto: ApproveCompOffDto,
  ) {
    const request = await this.prisma.compOffRequest.findFirst({
      where: { id, tenantId, status: 'PENDING' },
      include: {
        employee: {
          select: {
            id: true,
            managerId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(
        'Comp-off request not found or already processed',
      );
    }

    // Authorization check: Managers can only approve their direct reports
    if (approverRole === 'MANAGER') {
      if (request.employee.managerId !== approverId) {
        throw new ForbiddenException(
          'You can only approve comp-off requests for your direct reports',
        );
      }
    }

    if (request.approvalRequestId) {
      const { applyLocal } = await this.approvals.forwardApprove(
        request.approvalRequestId,
        approverId,
        dto.approverNote,
      );

      if (!applyLocal) {
        await this.approvals.enrichCurrentApproval([request], ['PENDING']);
        return request;
      }
    }

    // Update request
    const updated = await this.prisma.compOffRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approverId,
        approverNote: dto.approverNote,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Credit comp-off balance: find or create a COMP_OFF leave type, then update balance
    await this.creditCompOffBalance(
      tenantId,
      request.employeeId,
      Number(request.earnedDays),
    );

    // Notify the employee
    this.notificationsService
      .notifyEmployee(
        tenantId,
        request.employeeId,
        NotificationType.COMP_OFF_APPROVED,
        'Comp-Off Approved',
        `Your comp-off request for ${new Date(request.workedDate).toLocaleDateString()} (${request.earnedDays} day(s)) has been approved.`,
        '/leave/comp-off',
      )
      .catch(() => {}); // Fire and forget

    return updated;
  }

  /**
   * Reject a comp-off request
   */
  async reject(
    tenantId: string,
    id: string,
    approverId: string,
    approverRole: string,
    dto: ApproveCompOffDto,
  ) {
    const request = await this.prisma.compOffRequest.findFirst({
      where: { id, tenantId, status: 'PENDING' },
      include: {
        employee: {
          select: {
            id: true,
            managerId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(
        'Comp-off request not found or already processed',
      );
    }

    // Authorization check: Managers can only reject their direct reports
    if (approverRole === 'MANAGER') {
      if (request.employee.managerId !== approverId) {
        throw new ForbiddenException(
          'You can only reject comp-off requests for your direct reports',
        );
      }
    }

    if (request.approvalRequestId) {
      await this.approvals.forwardReject(
        request.approvalRequestId,
        approverId,
        dto.approverNote,
      );
    }

    // Update request
    const updated = await this.prisma.compOffRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approverId,
        approverNote: dto.approverNote,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify the employee
    this.notificationsService
      .notifyEmployee(
        tenantId,
        request.employeeId,
        NotificationType.COMP_OFF_REJECTED,
        'Comp-Off Rejected',
        `Your comp-off request for ${new Date(request.workedDate).toLocaleDateString()} has been rejected.${dto.approverNote ? ' Note: ' + dto.approverNote : ''}`,
        '/leave/comp-off',
      )
      .catch(() => {}); // Fire and forget

    return updated;
  }

  /**
   * Get all comp-off requests (Admin view)
   */
  async getAllRequests(tenantId: string, query: CompOffQueryDto) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      this.prisma.compOffRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: { select: { name: true } },
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.compOffRequest.count({ where }),
    ]);

    await this.approvals.enrichCurrentApproval(requests, ['PENDING']);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Credit comp-off balance to employee's leave balance
   * Finds or creates a COMP_OFF leave type, then increments the balance
   */
  private async creditCompOffBalance(
    tenantId: string,
    employeeId: string,
    earnedDays: number,
  ) {
    // Find the COMP_OFF leave type
    let compOffType = await this.prisma.leaveType.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: 'COMP_OFF',
        },
      },
    });

    // If COMP_OFF leave type doesn't exist, create it
    if (!compOffType) {
      compOffType = await this.prisma.leaveType.create({
        data: {
          tenantId,
          name: 'Compensatory Off',
          code: 'COMP_OFF',
          description: 'Compensatory leave for working on holidays/weekends',
          defaultDays: 0,
          carryForward: false,
          isPaid: true,
        },
      });
    }

    const currentYear = new Date().getFullYear();

    // Find or create leave balance
    const balance = await this.prisma.leaveBalance.findFirst({
      where: {
        tenantId,
        employeeId,
        leaveTypeId: compOffType.id,
        year: currentYear,
      },
    });

    if (balance) {
      await this.prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          totalDays: { increment: earnedDays },
        },
      });
    } else {
      await this.prisma.leaveBalance.create({
        data: {
          tenantId,
          employeeId,
          leaveTypeId: compOffType.id,
          year: currentYear,
          totalDays: earnedDays,
          usedDays: 0,
          pendingDays: 0,
          carriedOver: 0,
        },
      });
    }
  }
}
