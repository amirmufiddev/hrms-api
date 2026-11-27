import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RegularizationService } from './regularization.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  HrmsApprovalOrchestrator,
  HRMS_APPROVAL_MODULE,
} from '../../common/sso-client/hrms-approval.orchestrator';
import {
  createMockPrismaService,
  createMockNotificationsService,
} from '../../test/helpers';
import { RegularizationStatus, UserRole } from '@prisma/client';

describe('RegularizationService', () => {
  let service: RegularizationService;
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
    tenantId,
    managerId: approverId,
    firstName: 'Jane',
    lastName: 'Doe',
    employeeCode: 'EMP002',
    status: 'ACTIVE',
    department: { name: 'Operations' },
  };

  const mockRegularization = {
    id: 'reg-12345678-abcd',
    tenantId,
    employeeId,
    date: new Date('2026-09-01T00:00:00.000Z'),
    originalClockIn: null,
    originalClockOut: null,
    requestedClockIn: new Date('2026-09-01T09:00:00.000Z'),
    requestedClockOut: new Date('2026-09-01T18:00:00.000Z'),
    reason: 'Fingerprint scanner offline',
    status: RegularizationStatus.PENDING,
    approvalRequestId: 'sso-instance-reg-1',
    employee: mockEmployee,
  };

  beforeEach(async () => {
    orchestrator = {
      submitIfLinked: jest.fn().mockResolvedValue('sso-instance-reg-1'),
      forwardApprove: jest.fn().mockResolvedValue({ applyLocal: true }),
      forwardReject: jest.fn().mockResolvedValue({ applyLocal: true }),
      forwardCancel: jest.fn().mockResolvedValue(undefined),
      enrichCurrentApproval: jest.fn().mockImplementation(async (records) => records),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegularizationService,
        { provide: PrismaService, useValue: createMockPrismaService() },
        { provide: NotificationsService, useValue: createMockNotificationsService() },
        { provide: HrmsApprovalOrchestrator, useValue: orchestrator },
      ],
    }).compile();

    service = module.get<RegularizationService>(RegularizationService);
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
      date: '2026-09-01',
      requestedClockIn: '2026-09-01T09:00:00.000Z',
      requestedClockOut: '2026-09-01T18:00:00.000Z',
      reason: 'Fingerprint scanner offline',
    };

    it('should throw NotFoundException if employee not found or inactive', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.create(tenantId, employeeId, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if duplicate regularization request exists', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.attendanceRegularization.findUnique.mockResolvedValue(mockRegularization);

      await expect(
        service.create(tenantId, employeeId, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate hoursRequested, call submitIfLinked with nested contextData, and update approvalRequestId', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.attendanceRegularization.findUnique.mockResolvedValue(null);
      prisma.attendanceRecord.findUnique.mockResolvedValue(null);
      prisma.attendanceRegularization.create.mockResolvedValue({
        ...mockRegularization,
        approvalRequestId: null,
      });
      prisma.attendanceRegularization.update.mockResolvedValue({
        ...mockRegularization,
        approvalRequestId: 'sso-instance-reg-1',
      });

      const result = await service.create(tenantId, employeeId, createDto);

      // 9 hours difference (09:00 to 18:00)
      const expectedHours = 9;

      expect(orchestrator.submitIfLinked).toHaveBeenCalledWith({
        tenantId,
        moduleKey: HRMS_APPROVAL_MODULE.REGULARIZATION,
        recordId: mockRegularization.id,
        recordNumber: `RG-${mockRegularization.id.slice(0, 8).toUpperCase()}`,
        recordAmount: expectedHours,
        submittedByEmployeeId: employeeId,
        contextData: {
          hoursRequested: expectedHours,
          reason: createDto.reason,
          department: { name: 'Operations' },
          date: new Date(2026, 8, 1),
          requestedClockIn: createDto.requestedClockIn,
          requestedClockOut: createDto.requestedClockOut,
        },
      });

      expect(prisma.attendanceRegularization.update).toHaveBeenCalledWith({
        where: { id: mockRegularization.id },
        data: { approvalRequestId: 'sso-instance-reg-1' },
      });
      expect(result.approvalRequestId).toBe('sso-instance-reg-1');
    });

    it('should not update approvalRequestId if submitIfLinked returns null', async () => {
      orchestrator.submitIfLinked.mockResolvedValue(null);
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.attendanceRegularization.findUnique.mockResolvedValue(null);
      prisma.attendanceRecord.findUnique.mockResolvedValue(null);
      prisma.attendanceRegularization.create.mockResolvedValue({
        ...mockRegularization,
        approvalRequestId: null,
      });

      const result = await service.create(tenantId, employeeId, createDto);

      expect(prisma.attendanceRegularization.update).not.toHaveBeenCalled();
      expect(result.approvalRequestId).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // approve
  // -----------------------------------------------------------
  describe('approve', () => {
    const approveDto = { approverNote: 'Approved by manager' };

    it('should throw NotFoundException when regularization not found', async () => {
      prisma.attendanceRegularization.findFirst.mockResolvedValue(null);

      await expect(
        service.approve(tenantId, 'reg-missing', approverId, UserRole.MANAGER, approveDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when regularization is not PENDING', async () => {
      prisma.attendanceRegularization.findFirst.mockResolvedValue({
        ...mockRegularization,
        status: RegularizationStatus.APPROVED,
      });

      await expect(
        service.approve(tenantId, mockRegularization.id, approverId, UserRole.MANAGER, approveDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when manager approves non-direct report', async () => {
      prisma.attendanceRegularization.findFirst.mockResolvedValue({
        ...mockRegularization,
        employee: {
          ...mockEmployee,
          managerId: 'other-manager',
        },
      });

      await expect(
        service.approve(tenantId, mockRegularization.id, approverId, UserRole.MANAGER, approveDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('when approvalRequestId exists and applyLocal is false: calls forwardApprove, keeps PENDING without updating AttendanceRecord', async () => {
      orchestrator.forwardApprove.mockResolvedValue({ applyLocal: false });
      prisma.attendanceRegularization.findFirst.mockResolvedValue(mockRegularization);

      const result = await service.approve(
        tenantId,
        mockRegularization.id,
        approverId,
        UserRole.MANAGER,
        approveDto,
      );

      expect(orchestrator.forwardApprove).toHaveBeenCalledWith(
        'sso-instance-reg-1',
        approverId,
        'Approved by manager',
      );
      expect(prisma.attendanceRegularization.update).not.toHaveBeenCalled();
      expect(prisma.attendanceRecord.update).not.toHaveBeenCalled();
      expect(prisma.attendanceRecord.create).not.toHaveBeenCalled();
      expect(notifications.notifyEmployee).not.toHaveBeenCalled();
      expect(result.status).toBe(RegularizationStatus.PENDING);
    });

    it('when approvalRequestId exists and applyLocal is true: calls forwardApprove, updates status to APPROVED and updates AttendanceRecord', async () => {
      orchestrator.forwardApprove.mockResolvedValue({ applyLocal: true });
      prisma.attendanceRegularization.findFirst.mockResolvedValue(mockRegularization);
      prisma.attendanceRegularization.update.mockResolvedValue({
        ...mockRegularization,
        status: RegularizationStatus.APPROVED,
        approverId,
        approverNote: 'Approved by manager',
        approvedAt: new Date(),
      });
      prisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'att-rec-1',
        clockInTime: null,
        clockOutTime: null,
      });
      prisma.attendanceRecord.update.mockResolvedValue({});

      const result = await service.approve(
        tenantId,
        mockRegularization.id,
        approverId,
        UserRole.MANAGER,
        approveDto,
      );

      expect(orchestrator.forwardApprove).toHaveBeenCalledWith(
        'sso-instance-reg-1',
        approverId,
        'Approved by manager',
      );
      expect(prisma.attendanceRegularization.update).toHaveBeenCalledWith({
        where: { id: mockRegularization.id },
        data: {
          status: RegularizationStatus.APPROVED,
          approverId,
          approverNote: 'Approved by manager',
          approvedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
      expect(prisma.attendanceRecord.update).toHaveBeenCalledWith({
        where: { id: 'att-rec-1' },
        data: {
          clockInTime: mockRegularization.requestedClockIn,
          clockOutTime: mockRegularization.requestedClockOut,
          workedMinutes: 540,
          status: 'PRESENT',
        },
      });
      expect(notifications.notifyEmployee).toHaveBeenCalled();
      expect(result.status).toBe(RegularizationStatus.APPROVED);
    });

    it('when approvalRequestId is null: applies approval locally and creates AttendanceRecord if none exists', async () => {
      const regWithoutSso = {
        ...mockRegularization,
        approvalRequestId: null,
      };
      prisma.attendanceRegularization.findFirst.mockResolvedValue(regWithoutSso);
      prisma.attendanceRegularization.update.mockResolvedValue({
        ...regWithoutSso,
        status: RegularizationStatus.APPROVED,
        approverId,
        approvedAt: new Date(),
      });
      prisma.attendanceRecord.findUnique.mockResolvedValue(null);
      prisma.attendanceRecord.create.mockResolvedValue({});

      const result = await service.approve(
        tenantId,
        mockRegularization.id,
        approverId,
        UserRole.HR_ADMIN,
        approveDto,
      );

      expect(orchestrator.forwardApprove).not.toHaveBeenCalled();
      expect(prisma.attendanceRegularization.update).toHaveBeenCalled();
      expect(prisma.attendanceRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          employeeId,
          status: 'PRESENT',
          workedMinutes: 540,
          remarks: `Regularized: ${mockRegularization.reason}`,
        }),
      });
      expect(result.status).toBe(RegularizationStatus.APPROVED);
    });

    it('when forwardApprove throws: error propagates and local update is not performed', async () => {
      orchestrator.forwardApprove.mockRejectedValue(new Error('SSO approval failed'));
      prisma.attendanceRegularization.findFirst.mockResolvedValue(mockRegularization);

      await expect(
        service.approve(tenantId, mockRegularization.id, approverId, UserRole.MANAGER, approveDto),
      ).rejects.toThrow('SSO approval failed');

      expect(prisma.attendanceRegularization.update).not.toHaveBeenCalled();
      expect(prisma.attendanceRecord.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------
  // reject
  // -----------------------------------------------------------
  describe('reject', () => {
    const rejectDto = { approverNote: 'Invalid timestamp' };

    it('should throw NotFoundException when regularization not found', async () => {
      prisma.attendanceRegularization.findFirst.mockResolvedValue(null);

      await expect(
        service.reject(tenantId, 'reg-missing', approverId, UserRole.MANAGER, rejectDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when regularization is not PENDING', async () => {
      prisma.attendanceRegularization.findFirst.mockResolvedValue({
        ...mockRegularization,
        status: RegularizationStatus.REJECTED,
      });

      await expect(
        service.reject(tenantId, mockRegularization.id, approverId, UserRole.MANAGER, rejectDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when manager rejects non-direct report', async () => {
      prisma.attendanceRegularization.findFirst.mockResolvedValue({
        ...mockRegularization,
        employee: {
          ...mockEmployee,
          managerId: 'other-manager',
        },
      });

      await expect(
        service.reject(tenantId, mockRegularization.id, approverId, UserRole.MANAGER, rejectDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('when approvalRequestId exists: calls forwardReject then updates status to REJECTED', async () => {
      prisma.attendanceRegularization.findFirst.mockResolvedValue(mockRegularization);
      prisma.attendanceRegularization.update.mockResolvedValue({
        ...mockRegularization,
        status: RegularizationStatus.REJECTED,
        approverId,
        approverNote: 'Invalid timestamp',
      });

      const result = await service.reject(
        tenantId,
        mockRegularization.id,
        approverId,
        UserRole.MANAGER,
        rejectDto,
      );

      expect(orchestrator.forwardReject).toHaveBeenCalledWith(
        'sso-instance-reg-1',
        approverId,
        'Invalid timestamp',
      );
      expect(prisma.attendanceRegularization.update).toHaveBeenCalledWith({
        where: { id: mockRegularization.id },
        data: {
          status: RegularizationStatus.REJECTED,
          approverId,
          approverNote: 'Invalid timestamp',
          approvedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
      expect(notifications.notifyEmployee).toHaveBeenCalled();
      expect(result.status).toBe(RegularizationStatus.REJECTED);
    });

    it('when approvalRequestId is null: updates status to REJECTED without forwardReject', async () => {
      const regWithoutSso = {
        ...mockRegularization,
        approvalRequestId: null,
      };
      prisma.attendanceRegularization.findFirst.mockResolvedValue(regWithoutSso);
      prisma.attendanceRegularization.update.mockResolvedValue({
        ...regWithoutSso,
        status: RegularizationStatus.REJECTED,
      });

      const result = await service.reject(
        tenantId,
        mockRegularization.id,
        approverId,
        UserRole.HR_ADMIN,
        rejectDto,
      );

      expect(orchestrator.forwardReject).not.toHaveBeenCalled();
      expect(prisma.attendanceRegularization.update).toHaveBeenCalled();
      expect(result.status).toBe(RegularizationStatus.REJECTED);
    });

    it('when forwardReject throws: error propagates and local update is NOT called', async () => {
      orchestrator.forwardReject.mockRejectedValue(new Error('SSO reject failure'));
      prisma.attendanceRegularization.findFirst.mockResolvedValue(mockRegularization);

      await expect(
        service.reject(tenantId, mockRegularization.id, approverId, UserRole.MANAGER, rejectDto),
      ).rejects.toThrow('SSO reject failure');

      expect(prisma.attendanceRegularization.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------
  // getPendingApprovals / getMyRequests / getAllRequests
  // -----------------------------------------------------------
  describe('listing with currentApproval enrichment', () => {
    it('getPendingApprovals enriches records with enrichCurrentApproval', async () => {
      const pendingList = [mockRegularization];
      prisma.attendanceRegularization.findMany.mockResolvedValue(pendingList);

      const result = await service.getPendingApprovals(
        tenantId,
        approverId,
        UserRole.HR_ADMIN,
      );

      expect(prisma.attendanceRegularization.findMany).toHaveBeenCalled();
      expect(orchestrator.enrichCurrentApproval).toHaveBeenCalledWith(
        pendingList,
        ['PENDING'],
      );
      expect(result).toEqual(pendingList);
    });

    it('getMyRequests enriches records with enrichCurrentApproval', async () => {
      const requests = [mockRegularization];
      prisma.attendanceRegularization.findMany.mockResolvedValue(requests);
      prisma.attendanceRegularization.count.mockResolvedValue(1);

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
      const requests = [mockRegularization];
      prisma.attendanceRegularization.findMany.mockResolvedValue(requests);
      prisma.attendanceRegularization.count.mockResolvedValue(1);

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
