import { Test, TestingModule } from '@nestjs/testing';
import { SsoApprovalWebhookService } from './sso-approval-webhook.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../../common/email/email.service';
import { createMockPrismaService } from '../../test/helpers';
import { LeaveRequestStatus, ExpenseClaimStatus, NotificationType } from '@prisma/client';

describe('SsoApprovalWebhookService', () => {
  let service: SsoApprovalWebhookService;
  let prisma: any;
  let notificationsService: any;
  let emailService: any;

  beforeEach(async () => {
    notificationsService = {
      create: jest.fn().mockResolvedValue({}),
    };
    emailService = {
      sendEmail: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SsoApprovalWebhookService,
        { provide: PrismaService, useValue: createMockPrismaService() },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<SsoApprovalWebhookService>(SsoApprovalWebhookService);
    prisma = module.get(PrismaService);
  });

  it('handles APPROVED status: updates leaveRequest, moves pendingDays to usedDays, sends notification & email', async () => {
    const mockLeaveRequest = {
      id: 'leave-1',
      tenantId: 'tenant-1',
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-03'),
      totalDays: 3,
      status: LeaveRequestStatus.PENDING,
      approverNote: null,
      approvedAt: null,
      employee: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        user: { id: 'user-1' },
      },
      leaveType: { name: 'Annual Leave' },
    };

    const mockBalance = {
      id: 'bal-1',
      pendingDays: 3,
      usedDays: 0,
    };

    prisma.leaveRequest.findUnique.mockResolvedValue(mockLeaveRequest);
    prisma.leaveBalance.findFirst.mockResolvedValue(mockBalance);

    const res = await service.handleStatusChange({
      instanceId: 'inst-1',
      moduleKey: 'leave_request',
      recordId: 'leave-1',
      status: 'APPROVED',
      isCompleted: true,
      comments: 'Approved by Manager',
    });

    expect(res).toEqual({ success: true });
    expect(prisma.leaveRequest.update).toHaveBeenCalledWith({
      where: { id: 'leave-1' },
      data: {
        status: LeaveRequestStatus.APPROVED,
        approverNote: 'Approved by Manager',
        approvedAt: expect.any(Date),
      },
    });

    expect(prisma.leaveBalance.update).toHaveBeenCalledWith({
      where: { id: 'bal-1' },
      data: {
        pendingDays: { decrement: 3 },
        usedDays: { increment: 3 },
      },
    });

    expect(notificationsService.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: NotificationType.LEAVE_APPROVED,
      title: 'Leave Request Approved',
      message: 'Your Annual Leave request for 3 day(s) has been approved.',
      link: '/leave',
    });

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'john@example.com',
        subject: expect.stringContaining('Leave Request Approved'),
      }),
    );
  });

  it('handles REJECTED status: refunds pendingDays and sends rejection notification', async () => {
    const mockLeaveRequest = {
      id: 'leave-2',
      tenantId: 'tenant-1',
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-03'),
      totalDays: 3,
      status: LeaveRequestStatus.PENDING,
      approverNote: null,
      approvedAt: null,
      employee: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        user: { id: 'user-1' },
      },
      leaveType: { name: 'Annual Leave' },
    };

    const mockBalance = {
      id: 'bal-1',
      pendingDays: 3,
      usedDays: 0,
    };

    prisma.leaveRequest.findUnique.mockResolvedValue(mockLeaveRequest);
    prisma.leaveBalance.findFirst.mockResolvedValue(mockBalance);

    const res = await service.handleStatusChange({
      instanceId: 'inst-1',
      moduleKey: 'leave_request',
      recordId: 'leave-2',
      status: 'REJECTED',
      isCompleted: true,
      comments: 'Overlapping schedule',
    });

    expect(res).toEqual({ success: true });
    expect(prisma.leaveRequest.update).toHaveBeenCalledWith({
      where: { id: 'leave-2' },
      data: {
        status: LeaveRequestStatus.REJECTED,
        approverNote: 'Overlapping schedule',
        approvedAt: null,
      },
    });

    expect(prisma.leaveBalance.update).toHaveBeenCalledWith({
      where: { id: 'bal-1' },
      data: {
        pendingDays: { decrement: 3 },
      },
    });

    expect(notificationsService.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: NotificationType.LEAVE_REJECTED,
      title: 'Leave Request REJECTED',
      message: 'Your Annual Leave request for 3 day(s) has been rejected.',
      link: '/leave',
    });
  });

  it('handles APPROVED status for expense_claim: updates claim, sends notification & email', async () => {
    const mockExpenseClaim = {
      id: 'claim-1',
      tenantId: 'tenant-1',
      employeeId: 'emp-1',
      categoryId: 'cat-1',
      amount: '500000',
      status: ExpenseClaimStatus.SUBMITTED,
      approverNote: null,
      approvedAt: null,
      employee: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        user: { id: 'user-2' },
      },
      category: { name: 'Travel & Accommodation' },
    };

    prisma.expenseClaim.findUnique.mockResolvedValue(mockExpenseClaim);

    const res = await service.handleStatusChange({
      instanceId: 'inst-exp-1',
      moduleKey: 'expense_claim',
      recordId: 'claim-1',
      status: 'APPROVED',
      isCompleted: true,
      comments: 'Receipt validated',
    });

    expect(res).toEqual({ success: true });
    expect(prisma.expenseClaim.update).toHaveBeenCalledWith({
      where: { id: 'claim-1' },
      data: {
        status: ExpenseClaimStatus.APPROVED,
        approverNote: 'Receipt validated',
        approvedAt: expect.any(Date),
      },
    });

    expect(notificationsService.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      userId: 'user-2',
      type: NotificationType.EXPENSE_APPROVED,
      title: 'Expense Claim Approved',
      message: 'Your expense claim of 500000 (Travel & Accommodation) has been approved.',
      link: '/expenses',
    });

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        subject: expect.stringContaining('Expense Claim Approved'),
      }),
    );
  });

  it('handles REJECTED status for expense_claim: updates claim and sends rejection notification', async () => {
    const mockExpenseClaim = {
      id: 'claim-2',
      tenantId: 'tenant-1',
      employeeId: 'emp-1',
      categoryId: 'cat-1',
      amount: '750000',
      status: ExpenseClaimStatus.SUBMITTED,
      approverNote: null,
      approvedAt: null,
      employee: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        user: { id: 'user-2' },
      },
      category: { name: 'Meals' },
    };

    prisma.expenseClaim.findUnique.mockResolvedValue(mockExpenseClaim);

    const res = await service.handleStatusChange({
      instanceId: 'inst-exp-2',
      moduleKey: 'expense_claim',
      recordId: 'claim-2',
      status: 'REJECTED',
      isCompleted: true,
      comments: 'Out of policy',
    });

    expect(res).toEqual({ success: true });
    expect(prisma.expenseClaim.update).toHaveBeenCalledWith({
      where: { id: 'claim-2' },
      data: {
        status: ExpenseClaimStatus.REJECTED,
        approverNote: 'Out of policy',
        approvedAt: null,
      },
    });

    expect(notificationsService.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      userId: 'user-2',
      type: NotificationType.EXPENSE_REJECTED,
      title: 'Expense Claim Rejected',
      message: 'Your expense claim of 750000 (Meals) has been rejected.',
      link: '/expenses',
    });
  });
});
