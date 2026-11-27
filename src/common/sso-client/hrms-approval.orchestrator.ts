import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalSsoClient } from './approval-sso.client';

export const HRMS_APPROVAL_MODULE = {
  LEAVE: 'leave_request',
  EXPENSE: 'expense_claim',
  COMP_OFF: 'comp_off_request',
  REGULARIZATION: 'attendance_regularization',
  OVERTIME: 'overtime_request',
} as const;

export type HrmsApprovalModuleKey =
  (typeof HRMS_APPROVAL_MODULE)[keyof typeof HRMS_APPROVAL_MODULE];

export interface CurrentApprovalEmbed {
  stepName?: string;
  approverName?: string;
  approverId?: string;
  status?: string;
}

export interface ForwardApprovalResult {
  applyLocal: boolean;
}

export interface SubmitApprovalInput {
  tenantId: string;
  moduleKey: string;
  recordId: string;
  recordNumber?: string;
  recordAmount?: number;
  submittedByEmployeeId: string;
  contextData: Record<string, unknown>;
}

@Injectable()
export class HrmsApprovalOrchestrator {
  private readonly logger = new Logger(HrmsApprovalOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalSso: ApprovalSsoClient,
  ) {}

  async resolveSsoUserId(employeeId: string): Promise<string | undefined> {
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { ssoUserId: true, user: { select: { ssoUserId: true } } },
    });
    return emp?.ssoUserId || emp?.user?.ssoUserId || undefined;
  }

  async submitIfLinked(input: SubmitApprovalInput): Promise<string | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: { ssoCompanyId: true },
    });
    if (!tenant?.ssoCompanyId) return null;

    try {
      const submittedBy = await this.resolveSsoUserId(input.submittedByEmployeeId);
      const res = await this.approvalSso.submit({
        companyId: tenant.ssoCompanyId,
        moduleKey: input.moduleKey,
        recordId: input.recordId,
        recordNumber: input.recordNumber,
        recordAmount: input.recordAmount,
        submittedBy,
        contextData: input.contextData,
      });
      return res?.instanceId ?? null;
    } catch (err) {
      this.logger.warn(
        `SSO submit failed for ${input.moduleKey} ${input.recordId}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async forwardApprove(
    instanceId: string,
    actedByEmployeeId: string,
    comments?: string,
  ): Promise<ForwardApprovalResult> {
    const actedBy = await this.resolveSsoUserId(actedByEmployeeId);
    await this.approvalSso.approve(instanceId, { actedBy, comments });
    const summary = await this.approvalSso.getInstanceSummary(instanceId);
    return { applyLocal: summary?.isCompleted === true };
  }

  async forwardReject(
    instanceId: string,
    actedByEmployeeId: string,
    comments?: string,
  ): Promise<ForwardApprovalResult> {
    const actedBy = await this.resolveSsoUserId(actedByEmployeeId);
    await this.approvalSso.reject(instanceId, { actedBy, comments });
    return { applyLocal: true };
  }

  async forwardCancel(
    instanceId: string,
    actedByEmployeeId?: string,
  ): Promise<void> {
    const actedBy = actedByEmployeeId
      ? await this.resolveSsoUserId(actedByEmployeeId)
      : undefined;
    await this.approvalSso.cancel(instanceId, { actedBy });
  }

  async enrichCurrentApproval<
    T extends {
      approvalRequestId?: string | null;
      status?: string;
      currentApproval?: CurrentApprovalEmbed | null;
    },
  >(records: T[], pendingStatuses: string[]): Promise<void> {
    const targets = records.filter(
      (r) =>
        r.approvalRequestId &&
        r.status &&
        pendingStatuses.includes(r.status),
    );
    await Promise.allSettled(
      targets.map(async (r) => {
        const step = await this.approvalSso.getActiveStep(r.approvalRequestId!);
        r.currentApproval = step
          ? {
              stepName: step.step_name,
              approverName: step.approver_name,
              approverId: step.approver_id,
              status: step.status,
            }
          : null;
      }),
    );
  }

  async enrichByIds<
    T extends {
      approvalRequestId?: string | null;
      currentApproval?: CurrentApprovalEmbed | null;
    },
  >(records: T[]): Promise<void> {
    const targets = records.filter((r) => r.approvalRequestId);
    await Promise.allSettled(
      targets.map(async (r) => {
        const step = await this.approvalSso.getActiveStep(r.approvalRequestId!);
        r.currentApproval = step
          ? {
              stepName: step.step_name,
              approverName: step.approver_name,
              approverId: step.approver_id,
              status: step.status,
            }
          : null;
      }),
    );
  }
}
