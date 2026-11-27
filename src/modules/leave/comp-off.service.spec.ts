import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CompOffService } from './comp-off.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { HrmsApprovalOrchestrator } from '../../common/sso-client/hrms-approval.orchestrator';
import {
  createMockPrismaService,
  createMockNotificationsService,
} from '../../test/helpers';

describe('CompOffService', () => {
  let service: CompOffService;
  let prisma: any;
  let notifications: any;
  let orchestrator: {
    submitIfLinked: jest.Mock;
    forwardApprove: jest.Mock;
    forwardReject: jest.Mock;
    forwardCancel: jest.Mock;
    enrichCurrentApproval: jest.Mock;
  };

  const tenantId = 'test-tenant';
  const employeeId = 'emp-1';
  const approverId = 'emp-manager';

  const mockEmployee = {
    id: employeeId,
    managerId: approverId,
    firstName: 'John',
    lastName: 'Doe',
    employeeCode: 'EMP001',
    department: { name: 'Engineering' },
  };

  const mockCompOffRequest = {
    id: 'co-12345678-abcd',
    tenantId,
    employeeId,
    workedDate: new Date('2026-09-05T00:00:00.000Z'), // Saturday
    reason: 'Weekend release deployment',
    earnedDays: 1.0,
    expiryDate: new Date('2026-12-04T00:00:00.000Z'),
    status: 'PENDING',
    approvalRequestId: 'sso-instance-uuid-1',
    employee: mockEmployee,
  };

  beforeEach(async () => {
    orchestrator = {
      submitIfLinked: jest.fn().mockResolvedValue('sso-instance-uuid-1'),
      forwardApprove: jest.fn().mockResolvedValue({ applyLocal: true }),
      forwardReject: jest.fn().mockResolvedValue({ applyLocal: true }),
      forwardCancel: jest.fn().mockResolvedValue(undefined),
      enrichCurrentApproval: jest.fn().mockImplementation(async (records) => records),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompOffService,
        { provide: PrismaService, useValue: createMockPrismaService() },
        { provide: NotificationsService, useValue: createMockNotificationsService() },
        { provide: HrmsApprovalOrchestrator, useValue: orchestrator },
      ],
    }).compile();

    service = module.get<CompOffService>(CompOffService);
    prisma = module.get(PrismaService);
    notifications = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -----------------------------------------------------------
  // create
  // -----------------------------------------------------------
  describe('create', () => {
    const createDto = {
      workedDate: '2026-09-05', // Saturday
      reason: 'Weekend release deployment',
      earnedDays: 1.0,
    };

    it('should throw BadRequestException when worked date is in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureStr = futureDate.toISOString().split('T')[0];

      await expect(
        service.create(tenantId, employeeId, {
          ...createDto,
          workedDate: futureStr,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when worked date is not weekend and not holiday', async () => {
      // 2026-09-02 is Wednesday
      prisma.holiday.findFirst.mockResolvedValue(null);

      await expect(
        service.create(tenantId, employeeId, {
          ...createDto,
          workedDate: '2026-09-02',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow weekday if it is a holiday', async () => {
      prisma.holiday.findFirst.mockResolvedValue({
        id: 'hol-1',
        name: 'National Day',
        date: new Date('2026-09-02'),
      });
      prisma.compOffRequest.findUnique.mockResolvedValue(null);
      prisma.compOffRequest.create.mockResolvedValue({
        ...mockCompOffRequest,
        id: 'co-hol-12345678',
        workedDate: new Date('2026-09-02'),
      });
      prisma.compOffRequest.update.mockResolvedValue({
        ...mockCompOffRequest,
        id: 'co-hol-12345678',
        workedDate: new Date('2026-09-02'),
        approvalRequestId: 'sso-instance-uuid-1',
      });

      const result = await service.create(tenantId, employeeId, {
        ...createDto,
        workedDate: '2026-09-02',
      });

      expect(orchestrator.submitIfLinked).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          moduleKey: 'comp_off_request',
          recordId: 'co-hol-12345678',
          recordNumber: 'CO-CO-HOL-1',
          recordAmount: 1,
          submittedByEmployeeId: employeeId,
          contextData: expect.objectContaining({
            earnedDays: 1,
            isWeekend: false,
            isHoliday: true,
            department: { name: 'Engineering' },
            reason: createDto.reason,
          }),
        }),
      );
      expect(result.approvalRequestId).toBe('sso-instance-uuid-1');
    });

    it('should throw ConflictException if duplicate comp-off exists for date', async () => {
      prisma.holiday.findFirst.mockResolvedValue(null);
      prisma.compOffRequest.findUnique.mockResolvedValue(mockCompOffRequest);

      await expect(
        service.create(tenantId, employeeId, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should submit to orchestrator with nested contextData and update approvalRequestId', async () => {
      prisma.holiday.findFirst.mockResolvedValue(null);
      prisma.compOffRequest.findUnique.mockResolvedValue(null);
      prisma.compOffRequest.create.mockResolvedValue({
        ...mockCompOffRequest,
        approvalRequestId: null,
      });
      prisma.compOffRequest.update.mockResolvedValue({
        ...mockCompOffRequest,
        approvalRequestId: 'sso-instance-uuid-1',
      });

      const result = await service.create(tenantId, employeeId, createDto);

      expect(prisma.compOffRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          employeeId,
          workedDate: new Date('2026-09-05'),
          reason: createDto.reason,
          earnedDays: 1.0,
          status: 'PENDING',
        }),
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

      expect(orchestrator.submitIfLinked).toHaveBeenCalledWith({
        tenantId,
        moduleKey: 'comp_off_request',
        recordId: mockCompOffRequest.id,
        recordNumber: `CO-${mockCompOffRequest.id.slice(0, 8).toUpperCase()}`,
        recordAmount: 1.0,
        submittedByEmployeeId: employeeId,
        contextData: {
          earnedDays: 1.0,
          isWeekend: true,
          isHoliday: false,
          department: { name: 'Engineering' },
          workedDate: mockCompOffRequest.workedDate,
          reason: createDto.reason,
        },
      });

      expect(prisma.compOffRequest.update).toHaveBeenCalledWith({
        where: { id: mockCompOffRequest.id },
        data: { approvalRequestId: 'sso-instance-uuid-1' },
      });
      expect(result.approvalRequestId).toBe('sso-instance-uuid-1');
    });

    it('should proceed without updating approvalRequestId if submitIfLinked returns null', async () => {
      orchestrator.submitIfLinked.mockResolvedValue(null);
      prisma.holiday.findFirst.mockResolvedValue(null);
      prisma.compOffRequest.findUnique.mockResolvedValue(null);
      prisma.compOffRequest.create.mockResolvedValue({
        ...mockCompOffRequest,
        approvalRequestId: null,
      });

      const result = await service.create(tenantId, employeeId, createDto);

      expect(prisma.compOffRequest.update).not.toHaveBeenCalled();
      expect(result.approvalRequestId).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // approve
  // -----------------------------------------------------------
  describe('approve', () => {
    const approveDto = { approverNote: 'Looks good' };

    it('should throw NotFoundException when request not found', async () => {
      prisma.compOffRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.approve(tenantId, 'co-missing', approverId, 'MANAGER', approveDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when manager approves non-direct report', async () => {
      prisma.compOffRequest.findFirst.mockResolvedValue({
        ...mockCompOffRequest,
        employee: {
          ...mockEmployee,
          managerId: 'other-manager',
        },
      });

      await expect(
        service.approve(tenantId, mockCompOffRequest.id, approverId, 'MANAGER', approveDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('when approvalRequestId exists and applyLocal is false: forwardApprove called, request stays PENDING and does not credit balance', async () => {
      orchestrator.forwardApprove.mockResolvedValue({ applyLocal: false });
      prisma.compOffRequest.findFirst.mockResolvedValue(mockCompOffRequest);

      const result = await service.approve(
        tenantId,
        mockCompOffRequest.id,
        approverId,
        'MANAGER',
        approveDto,
      );

      expect(orchestrator.forwardApprove).toHaveBeenCalledWith(
        'sso-instance-uuid-1',
        approverId,
        'Looks good',
      );
      expect(prisma.compOffRequest.update).not.toHaveBeenCalled();
      expect(prisma.leaveBalance.findFirst).not.toHaveBeenCalled();
      expect(notifications.notifyEmployee).not.toHaveBeenCalled();
      expect(result.status).toBe('PENDING');
    });

    it('when approvalRequestId exists and applyLocal is true: forwardApprove called, request updated to APPROVED and balance credited', async () => {
      orchestrator.forwardApprove.mockResolvedValue({ applyLocal: true });
      prisma.compOffRequest.findFirst.mockResolvedValue(mockCompOffRequest);
      prisma.compOffRequest.update.mockResolvedValue({
        ...mockCompOffRequest,
        status: 'APPROVED',
        approverId,
        approverNote: 'Looks good',
        approvedAt: new Date(),
      });
      prisma.leaveType.findUnique.mockResolvedValue({
        id: 'lt-comp-off',
        code: 'COMP_OFF',
        tenantId,
      });
      prisma.leaveBalance.findFirst.mockResolvedValue({
        id: 'bal-1',
        totalDays: 2,
      });
      prisma.leaveBalance.update.mockResolvedValue({});

      const result = await service.approve(
        tenantId,
        mockCompOffRequest.id,
        approverId,
        'MANAGER',
        approveDto,
      );

      expect(orchestrator.forwardApprove).toHaveBeenCalledWith(
        'sso-instance-uuid-1',
        approverId,
        'Looks good',
      );
      expect(prisma.compOffRequest.update).toHaveBeenCalledWith({
        where: { id: mockCompOffRequest.id },
        data: {
          status: 'APPROVED',
          approverId,
          approverNote: 'Looks good',
          approvedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
      expect(prisma.leaveBalance.update).toHaveBeenCalledWith({
        where: { id: 'bal-1' },
        data: { totalDays: { increment: 1.0 } },
      });
      expect(notifications.notifyEmployee).toHaveBeenCalled();
      expect(result.status).toBe('APPROVED');
    });

    it('when approvalRequestId is null (no SSO instance): applies approval locally', async () => {
      const requestWithoutSso = {
        ...mockCompOffRequest,
        approvalRequestId: null,
      };
      prisma.compOffRequest.findFirst.mockResolvedValue(requestWithoutSso);
      prisma.compOffRequest.update.mockResolvedValue({
        ...requestWithoutSso,
        status: 'APPROVED',
        approverId,
        approvedAt: new Date(),
      });
      prisma.leaveType.findUnique.mockResolvedValue(null);
      prisma.leaveType.create.mockResolvedValue({
        id: 'lt-comp-off-new',
        code: 'COMP_OFF',
        tenantId,
      });
      prisma.leaveBalance.findFirst.mockResolvedValue(null);
      prisma.leaveBalance.create.mockResolvedValue({});

      const result = await service.approve(
        tenantId,
        mockCompOffRequest.id,
        approverId,
        'HR_ADMIN',
        approveDto,
      );

      expect(orchestrator.forwardApprove).not.toHaveBeenCalled();
      expect(prisma.compOffRequest.update).toHaveBeenCalled();
      expect(prisma.leaveType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ code: 'COMP_OFF' }),
      });
      expect(prisma.leaveBalance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          employeeId,
          leaveTypeId: 'lt-comp-off-new',
          totalDays: 1.0,
        }),
      });
      expect(result.status).toBe('APPROVED');
    });

    it('when forwardApprove throws: error propagates and local update is NOT called', async () => {
      orchestrator.forwardApprove.mockRejectedValue(new Error('SSO approval error'));
      prisma.compOffRequest.findFirst.mockResolvedValue(mockCompOffRequest);

      await expect(
        service.approve(tenantId, mockCompOffRequest.id, approverId, 'MANAGER', approveDto),
      ).rejects.toThrow('SSO approval error');

      expect(prisma.compOffRequest.update).not.toHaveBeenCalled();
      expect(prisma.leaveBalance.findFirst).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------
  // reject
  // -----------------------------------------------------------
  describe('reject', () => {
    const rejectDto = { approverNote: 'Insufficient reason' };

    it('should throw NotFoundException when request not found', async () => {
      prisma.compOffRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.reject(tenantId, 'co-missing', approverId, 'MANAGER', rejectDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when manager rejects non-direct report', async () => {
      prisma.compOffRequest.findFirst.mockResolvedValue({
        ...mockCompOffRequest,
        employee: {
          ...mockEmployee,
          managerId: 'other-manager',
        },
      });

      await expect(
        service.reject(tenantId, mockCompOffRequest.id, approverId, 'MANAGER', rejectDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('when approvalRequestId exists: calls forwardReject then updates status to REJECTED', async () => {
      prisma.compOffRequest.findFirst.mockResolvedValue(mockCompOffRequest);
      prisma.compOffRequest.update.mockResolvedValue({
        ...mockCompOffRequest,
        status: 'REJECTED',
        approverId,
        approverNote: 'Insufficient reason',
      });

      const result = await service.reject(
        tenantId,
        mockCompOffRequest.id,
        approverId,
        'MANAGER',
        rejectDto,
      );

      expect(orchestrator.forwardReject).toHaveBeenCalledWith(
        'sso-instance-uuid-1',
        approverId,
        'Insufficient reason',
      );
      expect(prisma.compOffRequest.update).toHaveBeenCalledWith({
        where: { id: mockCompOffRequest.id },
        data: {
          status: 'REJECTED',
          approverId,
          approverNote: 'Insufficient reason',
        },
        include: expect.any(Object),
      });
      expect(notifications.notifyEmployee).toHaveBeenCalled();
      expect(result.status).toBe('REJECTED');
    });

    it('when approvalRequestId is null: updates status to REJECTED without forwardReject', async () => {
      const requestWithoutSso = {
        ...mockCompOffRequest,
        approvalRequestId: null,
      };
      prisma.compOffRequest.findFirst.mockResolvedValue(requestWithoutSso);
      prisma.compOffRequest.update.mockResolvedValue({
        ...requestWithoutSso,
        status: 'REJECTED',
      });

      const result = await service.reject(
        tenantId,
        mockCompOffRequest.id,
        approverId,
        'HR_ADMIN',
        rejectDto,
      );

      expect(orchestrator.forwardReject).not.toHaveBeenCalled();
      expect(prisma.compOffRequest.update).toHaveBeenCalled();
      expect(result.status).toBe('REJECTED');
    });

    it('when forwardReject throws: error propagates and local update is NOT called', async () => {
      orchestrator.forwardReject.mockRejectedValue(new Error('SSO reject failure'));
      prisma.compOffRequest.findFirst.mockResolvedValue(mockCompOffRequest);

      await expect(
        service.reject(tenantId, mockCompOffRequest.id, approverId, 'MANAGER', rejectDto),
      ).rejects.toThrow('SSO reject failure');

      expect(prisma.compOffRequest.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------
  // getPendingApprovals / getMyRequests / getAllRequests
  // -----------------------------------------------------------
  describe('listing with currentApproval enrichment', () => {
    it('getPendingApprovals enriches records with enrichCurrentApproval', async () => {
      const pendingList = [mockCompOffRequest];
      prisma.compOffRequest.findMany.mockResolvedValue(pendingList);

      const result = await service.getPendingApprovals(tenantId, approverId, 'HR_ADMIN');

      expect(prisma.compOffRequest.findMany).toHaveBeenCalled();
      expect(orchestrator.enrichCurrentApproval).toHaveBeenCalledWith(
        pendingList,
        ['PENDING'],
      );
      expect(result).toEqual(pendingList);
    });

    it('getMyRequests enriches records with enrichCurrentApproval', async () => {
      const requests = [mockCompOffRequest];
      prisma.compOffRequest.findMany.mockResolvedValue(requests);
      prisma.compOffRequest.count.mockResolvedValue(1);

      const result = await service.getMyRequests(tenantId, employeeId, {
        page: 1,
        limit: 20,
      });

      expect(orchestrator.enrichCurrentApproval).toHaveBeenCalledWith(
        requests,
        ['PENDING'],
      );
      expect(result.data).toEqual(requests);
    });

    it('getAllRequests enriches records with enrichCurrentApproval', async () => {
      const requests = [mockCompOffRequest];
      prisma.compOffRequest.findMany.mockResolvedValue(requests);
      prisma.compOffRequest.count.mockResolvedValue(1);

      const result = await service.getAllRequests(tenantId, {
        page: 1,
        limit: 20,
      });

      expect(orchestrator.enrichCurrentApproval).toHaveBeenCalledWith(
        requests,
        ['PENDING'],
      );
      expect(result.data).toEqual(requests);
    });
  });
});
