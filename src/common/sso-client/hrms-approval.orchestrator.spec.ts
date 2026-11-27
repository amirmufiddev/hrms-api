import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  HrmsApprovalOrchestrator,
  HRMS_APPROVAL_MODULE,
} from './hrms-approval.orchestrator';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalSsoClient } from './approval-sso.client';
import { createMockPrismaService } from '../../test/helpers/prisma-mock';

describe('HrmsApprovalOrchestrator', () => {
  let orchestrator: HrmsApprovalOrchestrator;
  let prisma: jest.Mocked<PrismaService>;
  let approvalSso: jest.Mocked<ApprovalSsoClient>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    approvalSso = {
      submit: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      cancel: jest.fn(),
      getActiveStep: jest.fn(),
      getInstanceSummary: jest.fn(),
    } as unknown as jest.Mocked<ApprovalSsoClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrmsApprovalOrchestrator,
        { provide: PrismaService, useValue: prisma },
        { provide: ApprovalSsoClient, useValue: approvalSso },
      ],
    }).compile();

    orchestrator = module.get<HrmsApprovalOrchestrator>(HrmsApprovalOrchestrator);
  });

  describe('HRMS_APPROVAL_MODULE constants', () => {
    it('defines the correct module keys', () => {
      expect(HRMS_APPROVAL_MODULE).toEqual({
        LEAVE: 'leave_request',
        EXPENSE: 'expense_claim',
        COMP_OFF: 'comp_off_request',
        REGULARIZATION: 'attendance_regularization',
        OVERTIME: 'overtime_request',
      });
    });
  });

  describe('resolveSsoUserId', () => {
    it('returns employee ssoUserId if present', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({
        ssoUserId: 'sso-user-from-emp',
        user: { ssoUserId: 'sso-user-from-user' },
      });

      const res = await orchestrator.resolveSsoUserId('emp-1');
      expect(res).toBe('sso-user-from-emp');
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { id: 'emp-1' },
        select: { ssoUserId: true, user: { select: { ssoUserId: true } } },
      });
    });

    it('returns user ssoUserId if employee ssoUserId is missing', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({
        ssoUserId: null,
        user: { ssoUserId: 'sso-user-from-user' },
      });

      const res = await orchestrator.resolveSsoUserId('emp-2');
      expect(res).toBe('sso-user-from-user');
    });

    it('returns undefined if employee not found or has no ssoUserId', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await orchestrator.resolveSsoUserId('emp-unknown');
      expect(res).toBeUndefined();
    });
  });

  describe('submitIfLinked', () => {
    it('returns null if tenant has no ssoCompanyId', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        ssoCompanyId: null,
      });

      const res = await orchestrator.submitIfLinked({
        tenantId: 'tenant-1',
        moduleKey: HRMS_APPROVAL_MODULE.LEAVE,
        recordId: 'req-1',
        recordNumber: 'LR-001',
        submittedByEmployeeId: 'emp-1',
        contextData: { totalDays: 3 },
      });

      expect(res).toBeNull();
      expect(approvalSso.submit).not.toHaveBeenCalled();
    });

    it('calls approvalSso.submit with resolved ssoUserId and returns instanceId', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        ssoCompanyId: 'sso-co-1',
      });
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({
        ssoUserId: 'sso-user-1',
        user: null,
      });
      approvalSso.submit.mockResolvedValue({
        instanceId: 'inst-123',
        status: 'PENDING',
      });

      const res = await orchestrator.submitIfLinked({
        tenantId: 'tenant-1',
        moduleKey: HRMS_APPROVAL_MODULE.LEAVE,
        recordId: 'req-1',
        recordNumber: 'LR-001',
        recordAmount: 3,
        submittedByEmployeeId: 'emp-1',
        contextData: {
          leaveType: { code: 'CL', name: 'Casual Leave' },
          totalDays: 3,
        },
      });

      expect(res).toBe('inst-123');
      expect(approvalSso.submit).toHaveBeenCalledWith({
        companyId: 'sso-co-1',
        moduleKey: 'leave_request',
        recordId: 'req-1',
        recordNumber: 'LR-001',
        recordAmount: 3,
        submittedBy: 'sso-user-1',
        contextData: {
          leaveType: { code: 'CL', name: 'Casual Leave' },
          totalDays: 3,
        },
      });
    });

    it('swallows submit error, logs warning, and returns null', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        ssoCompanyId: 'sso-co-1',
      });
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({
        ssoUserId: 'sso-user-1',
        user: null,
      });
      approvalSso.submit.mockRejectedValue(new Error('SSO unavailable'));
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

      const res = await orchestrator.submitIfLinked({
        tenantId: 'tenant-1',
        moduleKey: HRMS_APPROVAL_MODULE.EXPENSE,
        recordId: 'exp-1',
        recordNumber: 'EX-001',
        submittedByEmployeeId: 'emp-1',
        contextData: { amount: 500000 },
      });

      expect(res).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('forwardApprove', () => {
    it('returns applyLocal: true when getInstanceSummary indicates isCompleted: true', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({
        ssoUserId: 'sso-approver-1',
        user: null,
      });
      approvalSso.approve.mockResolvedValue({
        instanceId: 'inst-1',
        status: 'APPROVED',
      });
      approvalSso.getInstanceSummary.mockResolvedValue({
        status: 'APPROVED',
        isCompleted: true,
      });

      const res = await orchestrator.forwardApprove(
        'inst-1',
        'emp-approver-1',
        'Looks good',
      );

      expect(res).toEqual({ applyLocal: true });
      expect(approvalSso.approve).toHaveBeenCalledWith('inst-1', {
        actedBy: 'sso-approver-1',
        comments: 'Looks good',
      });
      expect(approvalSso.getInstanceSummary).toHaveBeenCalledWith('inst-1');
    });

    it('returns applyLocal: false when getInstanceSummary indicates isCompleted is false', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({
        ssoUserId: 'sso-approver-1',
        user: null,
      });
      approvalSso.approve.mockResolvedValue({
        instanceId: 'inst-1',
        status: 'PENDING',
      });
      approvalSso.getInstanceSummary.mockResolvedValue({
        status: 'PENDING',
        isCompleted: false,
      });

      const res = await orchestrator.forwardApprove('inst-1', 'emp-approver-1');
      expect(res).toEqual({ applyLocal: false });
    });

    it('throws when approvalSso.approve throws', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({
        ssoUserId: 'sso-approver-1',
        user: null,
      });
      approvalSso.approve.mockRejectedValue(new Error('User is not active approver'));

      await expect(
        orchestrator.forwardApprove('inst-1', 'emp-approver-1'),
      ).rejects.toThrow('User is not active approver');
      expect(approvalSso.getInstanceSummary).not.toHaveBeenCalled();
    });
  });

  describe('forwardReject', () => {
    it('calls approvalSso.reject and returns applyLocal: true', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({
        ssoUserId: 'sso-rejecter-1',
        user: null,
      });
      approvalSso.reject.mockResolvedValue({
        instanceId: 'inst-1',
        status: 'REJECTED',
      });

      const res = await orchestrator.forwardReject(
        'inst-1',
        'emp-rejecter-1',
        'Not allowed',
      );

      expect(res).toEqual({ applyLocal: true });
      expect(approvalSso.reject).toHaveBeenCalledWith('inst-1', {
        actedBy: 'sso-rejecter-1',
        comments: 'Not allowed',
      });
    });

    it('throws when approvalSso.reject throws', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({
        ssoUserId: 'sso-rejecter-1',
        user: null,
      });
      approvalSso.reject.mockRejectedValue(new Error('Cannot reject'));

      await expect(
        orchestrator.forwardReject('inst-1', 'emp-rejecter-1'),
      ).rejects.toThrow('Cannot reject');
    });
  });

  describe('forwardCancel', () => {
    it('calls approvalSso.cancel with resolved ssoUserId', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({
        ssoUserId: 'sso-canceler-1',
        user: null,
      });
      approvalSso.cancel.mockResolvedValue({
        instanceId: 'inst-1',
        status: 'CANCELLED',
      });

      await orchestrator.forwardCancel('inst-1', 'emp-canceler-1');

      expect(approvalSso.cancel).toHaveBeenCalledWith('inst-1', {
        actedBy: 'sso-canceler-1',
      });
    });

    it('calls approvalSso.cancel without actedBy if actedByEmployeeId is omitted', async () => {
      approvalSso.cancel.mockResolvedValue({
        instanceId: 'inst-1',
        status: 'CANCELLED',
      });

      await orchestrator.forwardCancel('inst-1');

      expect(approvalSso.cancel).toHaveBeenCalledWith('inst-1', {
        actedBy: undefined,
      });
    });
  });

  describe('enrichCurrentApproval', () => {
    it('sets currentApproval only for matching pending statuses and records with approvalRequestId', async () => {
      approvalSso.getActiveStep.mockImplementation(async (id: string) => {
        if (id === 'inst-1') {
          return {
            step_name: 'Manager Approval',
            approver_name: 'Alice',
            approver_id: 'user-alice',
            status: 'active',
          };
        }
        return null;
      });

      const records = [
        { id: '1', approvalRequestId: 'inst-1', status: 'PENDING', currentApproval: undefined as any },
        { id: '2', approvalRequestId: 'inst-2', status: 'APPROVED', currentApproval: undefined as any },
        { id: '3', approvalRequestId: null, status: 'PENDING', currentApproval: undefined as any },
        { id: '4', approvalRequestId: 'inst-4', status: 'PENDING', currentApproval: undefined as any },
      ];

      await orchestrator.enrichCurrentApproval(records, ['PENDING', 'SUBMITTED']);

      expect(records[0].currentApproval).toEqual({
        stepName: 'Manager Approval',
        approverName: 'Alice',
        approverId: 'user-alice',
        status: 'active',
      });
      expect(records[1].currentApproval).toBeUndefined();
      expect(records[2].currentApproval).toBeUndefined();
      expect(records[3].currentApproval).toBeNull();
      expect(approvalSso.getActiveStep).toHaveBeenCalledTimes(2);
      expect(approvalSso.getActiveStep).toHaveBeenCalledWith('inst-1');
      expect(approvalSso.getActiveStep).toHaveBeenCalledWith('inst-4');
    });
  });

  describe('enrichByIds', () => {
    it('enriches currentApproval for any record with approvalRequestId regardless of status field', async () => {
      approvalSso.getActiveStep.mockResolvedValue({
        step_name: 'Director Approval',
        approver_name: 'Bob',
        approver_id: 'user-bob',
        status: 'active',
      });

      const records = [
        { id: 'rec-1', approvalRequestId: 'inst-1', currentApproval: undefined as any },
        { id: 'rec-2', approvalRequestId: null, currentApproval: undefined as any },
      ];

      await orchestrator.enrichByIds(records);

      expect(records[0].currentApproval).toEqual({
        stepName: 'Director Approval',
        approverName: 'Bob',
        approverId: 'user-bob',
        status: 'active',
      });
      expect(records[1].currentApproval).toBeUndefined();
      expect(approvalSso.getActiveStep).toHaveBeenCalledWith('inst-1');
    });
  });
});
