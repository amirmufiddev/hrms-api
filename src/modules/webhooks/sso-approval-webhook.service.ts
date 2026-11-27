import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../../common/email/email.service';
import { LeaveRequestStatus, ExpenseClaimStatus, NotificationType } from '@prisma/client';

export interface SsoApprovalStatusPayload {
  instanceId: string;
  moduleKey: string;
  recordId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVISED';
  isCompleted: boolean;
  actedBy?: string;
  comments?: string;
}

@Injectable()
export class SsoApprovalWebhookService {
  private readonly logger = new Logger(SsoApprovalWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  async handleStatusChange(payload: SsoApprovalStatusPayload): Promise<{ success: boolean }> {
    this.logger.log(
      `Received SSO approval status change: instance=${payload.instanceId}, module=${payload.moduleKey}, record=${payload.recordId}, status=${payload.status}, isCompleted=${payload.isCompleted}`,
    );

    if (payload.moduleKey === 'leave_request') {
      await this.handleLeaveRequestStatusChange(payload);
    } else if (payload.moduleKey === 'expense_claim') {
      await this.handleExpenseClaimStatusChange(payload);
    } else {
      this.logger.warn(`Unhandled moduleKey in approval webhook: ${payload.moduleKey}`);
    }

    return { success: true };
  }

  private async handleLeaveRequestStatusChange(payload: SsoApprovalStatusPayload) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id: payload.recordId },
      include: {
        employee: {
          include: {
            user: { select: { id: true } },
          },
        },
        leaveType: true,
      },
    });

    if (!leaveRequest) {
      this.logger.warn(`Leave request ${payload.recordId} not found for approval instance ${payload.instanceId}`);
      return;
    }

    // Map status from SSO to HRMS LeaveRequestStatus
    let targetStatus: LeaveRequestStatus | null = null;
    if (payload.status === 'APPROVED' && payload.isCompleted) {
      targetStatus = LeaveRequestStatus.APPROVED;
    } else if (payload.status === 'REJECTED') {
      targetStatus = LeaveRequestStatus.REJECTED;
    } else if (payload.status === 'CANCELLED') {
      targetStatus = LeaveRequestStatus.CANCELLED;
    }

    if (!targetStatus || targetStatus === leaveRequest.status) {
      return;
    }

    const leaveDays = Number(leaveRequest.totalDays);
    const year = leaveRequest.startDate.getFullYear();

    await this.prisma.$transaction(async (tx) => {
      // 1. Update LeaveRequest record
      await tx.leaveRequest.update({
        where: { id: leaveRequest.id },
        data: {
          status: targetStatus,
          approverNote: payload.comments ?? leaveRequest.approverNote,
          approvedAt: targetStatus === LeaveRequestStatus.APPROVED ? new Date() : leaveRequest.approvedAt,
        },
      });

      // 2. Reconcile LeaveBalance
      const balance = await tx.leaveBalance.findFirst({
        where: {
          tenantId: leaveRequest.tenantId,
          employeeId: leaveRequest.employeeId,
          leaveTypeId: leaveRequest.leaveTypeId,
          year,
        },
      });

      if (balance) {
        if (targetStatus === LeaveRequestStatus.APPROVED) {
          // Pending moves to Used
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pendingDays: { decrement: leaveDays },
              usedDays: { increment: leaveDays },
            },
          });
        } else if (targetStatus === LeaveRequestStatus.REJECTED || targetStatus === LeaveRequestStatus.CANCELLED) {
          // Pending is refunded
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pendingDays: { decrement: leaveDays },
            },
          });
        }
      }
    });

    // 3. Dispatch in-app notification & email
    const userId = leaveRequest.employee.user?.id;
    if (userId) {
      const isApproved = targetStatus === LeaveRequestStatus.APPROVED;
      const notifType = isApproved ? NotificationType.LEAVE_APPROVED : NotificationType.LEAVE_REJECTED;
      const notifTitle = isApproved ? 'Leave Request Approved' : 'Leave Request ' + targetStatus;
      const notifMessage = `Your ${leaveRequest.leaveType.name} request for ${leaveRequest.totalDays} day(s) has been ${targetStatus.toLowerCase()}.`;

      await this.notificationsService.create({
        tenantId: leaveRequest.tenantId,
        userId,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        link: `/leave`,
      });

      try {
        const recipientEmail = leaveRequest.employee.email;
        if (recipientEmail) {
          await this.emailService.sendEmail({
            to: recipientEmail,
            subject: `${notifTitle} - ${leaveRequest.leaveType.name}`,
            text: notifMessage,
            html: `<p>${notifMessage}</p>${payload.comments ? `<p><strong>Note:</strong> ${payload.comments}</p>` : ''}`,
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to send leave status email: ${(err as Error).message}`);
      }
    }
  }

  private async handleExpenseClaimStatusChange(payload: SsoApprovalStatusPayload) {
    const claim = await this.prisma.expenseClaim.findUnique({
      where: { id: payload.recordId },
      include: {
        employee: {
          include: {
            user: { select: { id: true } },
          },
        },
        category: true,
      },
    });

    if (!claim) {
      this.logger.warn(`Expense claim ${payload.recordId} not found for approval instance ${payload.instanceId}`);
      return;
    }

    let targetStatus: ExpenseClaimStatus | null = null;
    if (payload.status === 'APPROVED' && payload.isCompleted) {
      targetStatus = ExpenseClaimStatus.APPROVED;
    } else if (payload.status === 'REJECTED') {
      targetStatus = ExpenseClaimStatus.REJECTED;
    }

    if (!targetStatus || targetStatus === claim.status) {
      return;
    }

    const isApproved = targetStatus === ExpenseClaimStatus.APPROVED;

    await this.prisma.expenseClaim.update({
      where: { id: claim.id },
      data: {
        status: targetStatus,
        approverNote: payload.comments ?? claim.approverNote,
        approvedAt: isApproved ? new Date() : claim.approvedAt,
      },
    });

    const userId = claim.employee.user?.id;
    if (userId) {
      const notifType = isApproved ? NotificationType.EXPENSE_APPROVED : NotificationType.EXPENSE_REJECTED;
      const notifTitle = isApproved ? 'Expense Claim Approved' : 'Expense Claim Rejected';
      const notifMessage = `Your expense claim of ${claim.amount} (${claim.category.name}) has been ${targetStatus.toLowerCase()}.`;

      await this.notificationsService.create({
        tenantId: claim.tenantId,
        userId,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        link: `/expenses`,
      });

      try {
        const recipientEmail = claim.employee.email;
        if (recipientEmail) {
          await this.emailService.sendEmail({
            to: recipientEmail,
            subject: `${notifTitle} - ${claim.category.name}`,
            text: notifMessage,
            html: `<p>${notifMessage}</p>${payload.comments ? `<p><strong>Note:</strong> ${payload.comments}</p>` : ''}`,
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to send expense status email: ${(err as Error).message}`);
      }
    }
  }
}
