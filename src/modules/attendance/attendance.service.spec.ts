import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { OtCalculationService } from './ot-calculation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  createMockPrismaService,
  createMockNotificationsService,
  mockSuperAdmin,
  mockManager,
} from '../../test/helpers';
import { StorageService } from '../../common/storage/storage.service';
import {
  HrmsApprovalOrchestrator,
  HRMS_APPROVAL_MODULE,
} from '../../common/sso-client/hrms-approval.orchestrator';

function createMockOtCalculationService() {
  return {
    getOtRule: jest.fn().mockResolvedValue(null),
    calculateOtMinutes: jest.fn().mockReturnValue(0),
    calculateWorkedMinutes: jest.fn().mockReturnValue(0),
    calculateWorkedMinutesFromSessions: jest.fn().mockReturnValue(0),
    checkMonthlyOtLimit: jest
      .fn()
      .mockResolvedValue({ exceeded: false, currentTotal: 0, limit: null }),
    roundMinutes: jest.fn().mockReturnValue(0),
  };
}

function createMockStorageService() {
  return {
    upload: jest.fn().mockResolvedValue({ key: 'mock-photo-key' }),
  };
}

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: any;
  let otCalc: any;
  let notifications: any;
  let orchestrator: {
    submitIfLinked: jest.Mock;
    forwardApprove: jest.Mock;
    forwardReject: jest.Mock;
    forwardCancel: jest.Mock;
    enrichCurrentApproval: jest.Mock;
    enrichByIds: jest.Mock;
  };

  const tenantId = 'test-tenant';
  const employeeId = 'emp-1';

  const mockEmployee = {
    id: employeeId,
    tenantId,
    firstName: 'John',
    lastName: 'Doe',
    employeeCode: 'E001',
    status: 'ACTIVE',
    employmentType: 'FULL_TIME',
    payType: 'SALARIED',
    hourlyRate: null,
    otMultiplier: null,
  };

  const today = new Date();
  const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  beforeEach(async () => {
    orchestrator = {
      submitIfLinked: jest.fn().mockResolvedValue('sso-instance-ot-1'),
      forwardApprove: jest.fn().mockResolvedValue({ applyLocal: true }),
      forwardReject: jest.fn().mockResolvedValue({ applyLocal: true }),
      forwardCancel: jest.fn().mockResolvedValue(undefined),
      enrichCurrentApproval: jest.fn().mockImplementation(async (records) => records),
      enrichByIds: jest.fn().mockImplementation(async (records) => records),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: createMockPrismaService() },
        { provide: OtCalculationService, useValue: createMockOtCalculationService() },
        { provide: NotificationsService, useValue: createMockNotificationsService() },
        { provide: StorageService, useValue: createMockStorageService() },
        { provide: HrmsApprovalOrchestrator, useValue: orchestrator },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get(PrismaService);
    otCalc = module.get(OtCalculationService);
    notifications = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -----------------------------------------------------------
  // clockIn
  // -----------------------------------------------------------
  describe('clockIn', () => {
    // Valid GPS coordinates used in all clockIn tests (no geofencing: tenant.findUnique returns undefined by default)
    const mockCoords = { latitude: 28.6139, longitude: 77.209 };

    it('should create a new attendance record when none exists for today', async () => {
      const createdRecord = {
        id: 'att-1',
        tenantId,
        employeeId,
        date: dateOnly,
        clockInTime: expect.any(Date),
        status: 'PRESENT',
        source: 'WEB',
        sessions: [{ id: 'sess-1', inTime: new Date(), outTime: null }],
      };

      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.tenant.findUnique.mockResolvedValue(null); // no geofencing
      prisma.attendanceRecord.findUnique.mockResolvedValue(null);
      prisma.attendanceRecord.create.mockResolvedValue(createdRecord);
      // getAttendanceById is called at the end
      prisma.attendanceRecord.findFirst.mockResolvedValue({
        ...createdRecord,
        employee: mockEmployee,
      });

      const result = await service.clockIn(tenantId, employeeId, { ...mockCoords });

      expect(prisma.employee.findFirst).toHaveBeenCalledWith({
        where: { id: employeeId, tenantId, status: 'ACTIVE' },
        include: { branch: true },
      });
      expect(prisma.attendanceRecord.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.employee).toBeDefined();
    });

    it('should throw NotFoundException when employee not found', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(service.clockIn(tenantId, employeeId, { ...mockCoords })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when already clocked in (open session exists)', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.tenant.findUnique.mockResolvedValue(null); // no geofencing
      prisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'att-1',
        sessions: [{ id: 'sess-1', inTime: new Date(), outTime: null }],
      });

      await expect(service.clockIn(tenantId, employeeId, { ...mockCoords })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.clockIn(tenantId, employeeId, { ...mockCoords })).rejects.toThrow(
        'Already clocked in',
      );
    });

    it('should create a new session when attendance exists but no open session', async () => {
      const existingAttendance = {
        id: 'att-1',
        clockInTime: new Date(),
        sessions: [
          { id: 'sess-1', inTime: new Date(), outTime: new Date() },
        ],
      };

      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.tenant.findUnique.mockResolvedValue(null); // no geofencing
      prisma.attendanceRecord.findUnique.mockResolvedValue(existingAttendance);
      prisma.attendanceSession.create.mockResolvedValue({ id: 'sess-2' });
      prisma.attendanceRecord.findFirst.mockResolvedValue({
        ...existingAttendance,
        employee: mockEmployee,
      });

      const result = await service.clockIn(tenantId, employeeId, { ...mockCoords });

      expect(prisma.attendanceSession.create).toHaveBeenCalledWith({
        data: {
          attendanceId: 'att-1',
          inTime: expect.any(Date),
        },
      });
      expect(result).toBeDefined();
    });

    it('should update clockInTime when attendance exists with no clockInTime', async () => {
      const existingAttendance = {
        id: 'att-1',
        clockInTime: null,
        sessions: [
          { id: 'sess-1', inTime: new Date(), outTime: new Date() },
        ],
      };

      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.tenant.findUnique.mockResolvedValue(null); // no geofencing
      prisma.attendanceRecord.findUnique.mockResolvedValue(existingAttendance);
      prisma.attendanceSession.create.mockResolvedValue({ id: 'sess-2' });
      prisma.attendanceRecord.update.mockResolvedValue({});
      prisma.attendanceRecord.findFirst.mockResolvedValue({
        ...existingAttendance,
        employee: mockEmployee,
      });

      await service.clockIn(tenantId, employeeId, { ...mockCoords, source: 'MOBILE' as any, remarks: 'late' });

      expect(prisma.attendanceRecord.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: expect.objectContaining({
          clockInTime: expect.any(Date),
          status: 'PRESENT',
          source: 'MOBILE',
          remarks: 'late',
        }),
      });
    });

    it('should use WEB as default source when not provided', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.tenant.findUnique.mockResolvedValue(null); // no geofencing
      prisma.attendanceRecord.findUnique.mockResolvedValue(null);
      prisma.attendanceRecord.create.mockResolvedValue({
        id: 'att-1',
        sessions: [],
      });
      prisma.attendanceRecord.findFirst.mockResolvedValue({
        id: 'att-1',
        employee: mockEmployee,
        sessions: [],
      });

      await service.clockIn(tenantId, employeeId, { ...mockCoords });

      expect(prisma.attendanceRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'WEB',
          }),
        }),
      );
    });

    it('should validate branch geofencing when employee is assigned to a branch with coordinates', async () => {
      const employeeWithBranch = {
        ...mockEmployee,
        branch: {
          id: 'branch-1',
          name: 'Bandung Branch',
          isActive: true,
          latitude: -6.9175,
          longitude: 107.6191,
          radiusMeters: 100,
        },
      };
      prisma.employee.findFirst.mockResolvedValue(employeeWithBranch);

      // Coordinate too far (> 100m)
      const farCoords = { latitude: -6.95, longitude: 107.65 };

      await expect(
        service.clockIn(tenantId, employeeId, { ...farCoords }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.clockIn(tenantId, employeeId, { ...farCoords }),
      ).rejects.toThrow(/from Bandung Branch/);
    });

    it('should allow clock-in within branch geofencing radius', async () => {
      const employeeWithBranch = {
        ...mockEmployee,
        branch: {
          id: 'branch-1',
          name: 'Bandung Branch',
          isActive: true,
          latitude: -6.9175,
          longitude: 107.6191,
          radiusMeters: 200,
        },
      };
      prisma.employee.findFirst.mockResolvedValue(employeeWithBranch);
      prisma.attendanceRecord.findUnique.mockResolvedValue(null);
      prisma.attendanceRecord.create.mockResolvedValue({ id: 'att-1', sessions: [] });
      prisma.attendanceRecord.findFirst.mockResolvedValue({
        id: 'att-1',
        employee: employeeWithBranch,
        sessions: [],
      });

      // Coordinate exactly at the branch
      const exactCoords = { latitude: -6.9175, longitude: 107.6191 };

      const result = await service.clockIn(tenantId, employeeId, { ...exactCoords });
      expect(result).toBeDefined();
    });
  });

  // -----------------------------------------------------------
  // clockOut
  // -----------------------------------------------------------
  describe('clockOut', () => {
    it('should throw BadRequestException when no attendance record for today', async () => {
      prisma.attendanceRecord.findUnique.mockResolvedValue(null);

      await expect(service.clockOut(tenantId, employeeId, {})).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.clockOut(tenantId, employeeId, {})).rejects.toThrow(
        'No clock-in record found for today',
      );
    });

    it('should throw BadRequestException when no open session found', async () => {
      prisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'att-1',
        sessions: [{ id: 'sess-1', inTime: new Date(), outTime: new Date() }],
      });

      await expect(service.clockOut(tenantId, employeeId, {})).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.clockOut(tenantId, employeeId, {})).rejects.toThrow(
        'No open session found',
      );
    });

    it('should close the open session and update attendance', async () => {
      const clockInTime = new Date(Date.now() - 8 * 60 * 60 * 1000); // 8 hours ago
      const openSession = { id: 'sess-1', inTime: clockInTime, outTime: null };

      prisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'att-1',
        standardWorkMinutes: 480,
        breakMinutes: 0,
        remarks: null,
        sessions: [openSession],
      });
      prisma.attendanceSession.update.mockResolvedValue({});
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      otCalc.getOtRule.mockResolvedValue(null);
      otCalc.calculateOtMinutes.mockReturnValue(0);

      prisma.attendanceSession.findMany.mockResolvedValue([
        { ...openSession, sessionMinutes: 480 },
      ]);
      prisma.attendanceRecord.update.mockResolvedValue({});
      prisma.attendanceRecord.findFirst.mockResolvedValue({
        id: 'att-1',
        employee: mockEmployee,
        sessions: [],
      });

      const result = await service.clockOut(tenantId, employeeId, {});

      expect(prisma.attendanceSession.update).toHaveBeenCalledWith({
        where: { id: 'sess-1' },
        data: {
          outTime: expect.any(Date),
          sessionMinutes: expect.any(Number),
        },
      });
      expect(prisma.attendanceRecord.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should use breakMinutes from dto when provided', async () => {
      const clockInTime = new Date(Date.now() - 9 * 60 * 60 * 1000);
      const openSession = { id: 'sess-1', inTime: clockInTime, outTime: null };

      prisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'att-1',
        standardWorkMinutes: 480,
        breakMinutes: 0,
        remarks: null,
        sessions: [openSession],
      });
      prisma.attendanceSession.update.mockResolvedValue({});
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      otCalc.getOtRule.mockResolvedValue(null);
      otCalc.calculateOtMinutes.mockReturnValue(0);

      prisma.attendanceSession.findMany.mockResolvedValue([
        { id: 'sess-1', sessionMinutes: 540 },
      ]);
      prisma.attendanceRecord.update.mockResolvedValue({});
      prisma.attendanceRecord.findFirst.mockResolvedValue({
        id: 'att-1',
        employee: mockEmployee,
        sessions: [],
      });

      await service.clockOut(tenantId, employeeId, { breakMinutes: 60 });

      expect(prisma.attendanceRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            breakMinutes: 60,
          }),
        }),
      );
    });

    it('should calculate OT minutes via the OtCalculationService and submit to SSO if OT > 0', async () => {
      const clockInTime = new Date(Date.now() - 10 * 60 * 60 * 1000);
      const openSession = { id: 'sess-1', inTime: clockInTime, outTime: null };
      const otRule = { id: 'rule-1', dailyThresholdMinutes: 480 };

      prisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'att-1',
        date: dateOnly,
        standardWorkMinutes: 480,
        breakMinutes: 0,
        remarks: null,
        approvalRequestId: null,
        sessions: [openSession],
      });
      prisma.attendanceSession.update.mockResolvedValue({});
      prisma.employee.findUnique.mockResolvedValue({
        ...mockEmployee,
        department: { name: 'Operations' },
      });
      otCalc.getOtRule.mockResolvedValue(otRule);
      otCalc.calculateOtMinutes.mockReturnValue(120);

      prisma.attendanceSession.findMany.mockResolvedValue([
        { id: 'sess-1', sessionMinutes: 600 },
      ]);
      prisma.attendanceRecord.update.mockResolvedValue({});
      prisma.attendanceRecord.findFirst.mockResolvedValue({
        id: 'att-1',
        employee: mockEmployee,
        sessions: [],
      });

      await service.clockOut(tenantId, employeeId, {});

      expect(otCalc.getOtRule).toHaveBeenCalledWith(tenantId, mockEmployee.employmentType);
      expect(otCalc.calculateOtMinutes).toHaveBeenCalledWith(600, 480, otRule);
      expect(prisma.attendanceRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            otMinutesCalculated: 120,
          }),
        }),
      );
      expect(orchestrator.submitIfLinked).toHaveBeenCalledWith({
        tenantId,
        moduleKey: HRMS_APPROVAL_MODULE.OVERTIME,
        recordId: 'att-1',
        recordNumber: 'OT-ATT-1',
        recordAmount: 120,
        submittedByEmployeeId: employeeId,
        contextData: {
          otMinutesCalculated: 120,
          workedMinutes: 600,
          department: { name: 'Operations' },
          date: dateOnly,
        },
      });
      expect(prisma.attendanceRecord.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: { approvalRequestId: 'sso-instance-ot-1' },
      });
    });

    it('should not submit to SSO when otMinutesCalculated is 0', async () => {
      const clockInTime = new Date(Date.now() - 8 * 60 * 60 * 1000);
      const openSession = { id: 'sess-1', inTime: clockInTime, outTime: null };

      prisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'att-1',
        date: dateOnly,
        standardWorkMinutes: 480,
        breakMinutes: 0,
        remarks: null,
        approvalRequestId: null,
        sessions: [openSession],
      });
      prisma.attendanceSession.update.mockResolvedValue({});
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      otCalc.getOtRule.mockResolvedValue(null);
      otCalc.calculateOtMinutes.mockReturnValue(0);

      prisma.attendanceSession.findMany.mockResolvedValue([
        { id: 'sess-1', sessionMinutes: 480 },
      ]);
      prisma.attendanceRecord.update.mockResolvedValue({});
      prisma.attendanceRecord.findFirst.mockResolvedValue({
        id: 'att-1',
        employee: mockEmployee,
        sessions: [],
      });

      await service.clockOut(tenantId, employeeId, {});

      expect(orchestrator.submitIfLinked).not.toHaveBeenCalled();
    });

    it('should not submit to SSO if attendance already has approvalRequestId', async () => {
      const clockInTime = new Date(Date.now() - 10 * 60 * 60 * 1000);
      const openSession = { id: 'sess-1', inTime: clockInTime, outTime: null };

      prisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'att-1',
        date: dateOnly,
        standardWorkMinutes: 480,
        breakMinutes: 0,
        remarks: null,
        approvalRequestId: 'existing-instance-id',
        sessions: [openSession],
      });
      prisma.attendanceSession.update.mockResolvedValue({});
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      otCalc.getOtRule.mockResolvedValue(null);
      otCalc.calculateOtMinutes.mockReturnValue(120);

      prisma.attendanceSession.findMany.mockResolvedValue([
        { id: 'sess-1', sessionMinutes: 600 },
      ]);
      prisma.attendanceRecord.update.mockResolvedValue({});
      prisma.attendanceRecord.findFirst.mockResolvedValue({
        id: 'att-1',
        employee: mockEmployee,
        sessions: [],
      });

      await service.clockOut(tenantId, employeeId, {});

      expect(orchestrator.submitIfLinked).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------
  // getTodayStatus
  // -----------------------------------------------------------
  describe('getTodayStatus', () => {
    it('should return NOT_CLOCKED_IN when no attendance record exists', async () => {
      prisma.attendanceRecord.findUnique.mockResolvedValue(null);

      const result = await service.getTodayStatus(tenantId, employeeId);

      expect(result).toEqual({
        status: 'NOT_CLOCKED_IN',
        clockedIn: false,
        clockInTime: null,
        clockOutTime: null,
        workedMinutes: 0,
        officeLatitude: null,
        officeLongitude: null,
        officeRadiusMeters: null,
      });
    });

    it('should return clockedIn: true when last session has no outTime', async () => {
      const sessionInTime = new Date();
      prisma.attendanceRecord.findUnique.mockResolvedValue({
        status: 'PRESENT',
        clockInTime: sessionInTime,
        clockOutTime: null,
        workedMinutes: 0,
        otMinutesCalculated: 0,
        sessions: [{ id: 'sess-1', inTime: sessionInTime, outTime: null }],
      });

      const result = await service.getTodayStatus(tenantId, employeeId);

      expect(result.clockedIn).toBe(true);
      expect(result.status).toBe('PRESENT');
      expect(result.currentSessionStart).toEqual(sessionInTime);
    });

    it('should return clockedIn: false when last session is closed', async () => {
      const now = new Date();
      prisma.attendanceRecord.findUnique.mockResolvedValue({
        status: 'PRESENT',
        clockInTime: now,
        clockOutTime: now,
        workedMinutes: 480,
        otMinutesCalculated: 0,
        sessions: [{ id: 'sess-1', inTime: now, outTime: now }],
      });

      const result = await service.getTodayStatus(tenantId, employeeId);

      expect(result.clockedIn).toBe(false);
      expect(result.currentSessionStart).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // getMyAttendance
  // -----------------------------------------------------------
  describe('getMyAttendance', () => {
    it('should return attendance records for the given date range', async () => {
      const records = [
        { id: 'att-1', date: new Date('2025-01-01'), sessions: [] },
        { id: 'att-2', date: new Date('2025-01-02'), sessions: [] },
      ];
      prisma.attendanceRecord.findMany.mockResolvedValue(records);

      const result = await service.getMyAttendance(tenantId, employeeId, {
        from: '2025-01-01',
        to: '2025-01-31',
      });

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          employeeId,
          date: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        include: {
          sessions: { orderBy: { inTime: 'asc' } },
        },
        orderBy: { date: 'desc' },
      });
      expect(result).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------
  // getEmployeeAttendance
  // -----------------------------------------------------------
  describe('getEmployeeAttendance', () => {
    it('should return attendance with employee details', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([]);

      await service.getEmployeeAttendance(tenantId, employeeId, {
        from: '2025-01-01',
        to: '2025-01-31',
      });

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            employee: expect.any(Object),
          }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([]);

      await service.getEmployeeAttendance(tenantId, employeeId, {
        from: '2025-01-01',
        to: '2025-01-31',
        status: 'PRESENT' as any,
      });

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PRESENT',
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------
  // getAttendanceSummary
  // -----------------------------------------------------------
  describe('getAttendanceSummary', () => {
    it('should aggregate attendance records and return summary', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { status: 'PRESENT', workedMinutes: 480, otMinutesCalculated: 60, otMinutesApproved: 30 },
        { status: 'PRESENT', workedMinutes: 500, otMinutesCalculated: 80, otMinutesApproved: null },
        { status: 'LEAVE', workedMinutes: 0, otMinutesCalculated: 0, otMinutesApproved: null },
      ]);

      const result = await service.getAttendanceSummary(tenantId, {
        from: '2025-01-01',
        to: '2025-01-31',
      });

      expect(result.totalRecords).toBe(3);
      expect(result.statusCounts).toEqual({ PRESENT: 2, LEAVE: 1 });
      expect(result.totalWorkedMinutes).toBe(980);
      expect(result.totalOtCalculated).toBe(140);
      expect(result.totalOtApproved).toBe(30);
      expect(result.averageWorkedMinutesPerDay).toBe(Math.round(980 / 3));
    });

    it('should return zeros when no records found', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([]);

      const result = await service.getAttendanceSummary(tenantId, {
        from: '2025-01-01',
        to: '2025-01-31',
      });

      expect(result.totalRecords).toBe(0);
      expect(result.totalWorkedMinutes).toBe(0);
      expect(result.averageWorkedMinutesPerDay).toBe(0);
    });

    it('should filter by employeeId when provided', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([]);

      await service.getAttendanceSummary(tenantId, {
        from: '2025-01-01',
        to: '2025-01-31',
        employeeId: 'emp-1',
      });

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employeeId: 'emp-1',
          }),
        }),
      );
    });

    it('should filter by departmentId when provided', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([]);

      await service.getAttendanceSummary(tenantId, {
        from: '2025-01-01',
        to: '2025-01-31',
        departmentId: 'dept-1',
      });

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employee: { departmentId: 'dept-1' },
          }),
        }),
      );
    });
  });

  describe('getAttendanceMatrix', () => {
    it('returns rows with day cells for paginated employees', async () => {
      prisma.employee.count.mockResolvedValue(1);
      prisma.employee.findMany.mockResolvedValue([
        {
          id: 'emp-1',
          firstName: 'A',
          lastName: 'B',
          employeeCode: '900001',
          department: { id: 'd1', name: 'Ops' },
        },
      ]);
      prisma.attendanceRecord.findMany.mockResolvedValue([
        {
          employeeId: 'emp-1',
          date: new Date('2025-10-01T00:00:00.000Z'),
          status: 'PRESENT',
        },
      ]);

      const result = await service.getAttendanceMatrix(tenantId, {
        from: '2025-10-01',
        to: '2025-10-02',
        page: 1,
        limit: 50,
      });

      expect(result.days).toEqual(['2025-10-01', '2025-10-02']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].cells['2025-10-01']).toBe('PRESENT');
      expect(result.rows[0].cells['2025-10-02']).toBeNull();
      expect(result.pagination.total).toBe(1);
    });

    it('rejects ranges longer than 31 days', async () => {
      await expect(
        service.getAttendanceMatrix(tenantId, {
          from: '2025-01-01',
          to: '2025-02-05',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('filters by employmentType when provided', async () => {
      prisma.employee.count.mockResolvedValue(0);
      prisma.employee.findMany.mockResolvedValue([]);

      await service.getAttendanceMatrix(tenantId, {
        from: '2025-10-01',
        to: '2025-10-02',
        employmentType: 'DAILY_WORKER' as any,
      });

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([{ employmentType: 'DAILY_WORKER' }]),
          },
        }),
      );
    });
  });

  // -----------------------------------------------------------
  // getPendingOtApprovals
  // -----------------------------------------------------------
  describe('getPendingOtApprovals', () => {
    it('should return all pending OT records for SUPER_ADMIN and enrich currentApproval', async () => {
      const records = [
        {
          id: 'att-1',
          otMinutesCalculated: 120,
          otMinutesApproved: null,
          approvalRequestId: 'sso-instance-ot-1',
        },
      ];
      prisma.attendanceRecord.findMany.mockResolvedValue(records);

      const result = await service.getPendingOtApprovals(mockSuperAdmin);

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockSuperAdmin.tenantId,
            otMinutesCalculated: { gt: 0 },
            otMinutesApproved: null,
            clockOutTime: { not: null },
          }),
        }),
      );
      expect(orchestrator.enrichByIds).toHaveBeenCalledWith(records);
      expect(result).toEqual(records);
    });

    it('should scope MANAGER to direct reports only', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([]);

      await service.getPendingOtApprovals(mockManager);

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employee: { managerId: mockManager.employeeId },
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------
  // getOtApprovalStats
  // -----------------------------------------------------------
  describe('getOtApprovalStats', () => {
    it('should return OT stats scoped to direct reports for MANAGER', async () => {
      prisma.attendanceRecord.count
        .mockResolvedValueOnce(4) // pendingCount
        .mockResolvedValueOnce(2); // approvedTodayCount
      prisma.attendanceRecord.aggregate.mockResolvedValueOnce({
        _sum: { otMinutesCalculated: 300 },
      });

      const result = await service.getOtApprovalStats(mockManager);

      expect(prisma.attendanceRecord.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          employee: { managerId: mockManager.employeeId },
          otMinutesCalculated: { gt: 0 },
          otMinutesApproved: null,
        }),
      });
      expect(result).toEqual({
        pending: 4,
        approvedToday: 2,
        totalOtMinutes: 300,
      });
    });

    it('should return OT stats for whole tenant for SUPER_ADMIN', async () => {
      prisma.attendanceRecord.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);
      prisma.attendanceRecord.aggregate.mockResolvedValueOnce({
        _sum: { otMinutesCalculated: 750 },
      });

      const result = await service.getOtApprovalStats(mockSuperAdmin);

      expect(result).toEqual({
        pending: 10,
        approvedToday: 5,
        totalOtMinutes: 750,
      });
    });
  });

  // -----------------------------------------------------------
  // approveOt
  // -----------------------------------------------------------
  describe('approveOt', () => {
    const attendanceRecord = {
      id: 'att-1',
      tenantId,
      employeeId,
      date: new Date('2025-01-15'),
      otMinutesCalculated: 120,
      otMinutesApproved: null,
      approvalRequestId: null,
      remarks: null,
    };

    it('should approve OT locally when without approvalRequestId and notify employee', async () => {
      prisma.attendanceRecord.findFirst.mockResolvedValue(attendanceRecord);
      prisma.attendanceRecord.update.mockResolvedValue({
        ...attendanceRecord,
        otMinutesApproved: 90,
        employee: mockEmployee,
        sessions: [],
      });

      const result = await service.approveOt(tenantId, 'att-1', {
        otMinutesApproved: 90,
      });

      expect(orchestrator.forwardApprove).not.toHaveBeenCalled();
      expect(prisma.attendanceRecord.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: {
          otMinutesApproved: 90,
          remarks: null,
        },
        include: expect.any(Object),
      });
      expect(notifications.notifyEmployee).toHaveBeenCalled();
      expect(result.otMinutesApproved).toBe(90);
    });

    it('when approvalRequestId exists and applyLocal is false: calls forwardApprove and returns attendance without setting otMinutesApproved', async () => {
      const recordWithSso = {
        ...attendanceRecord,
        approvalRequestId: 'sso-instance-ot-1',
      };
      orchestrator.forwardApprove.mockResolvedValue({ applyLocal: false });
      prisma.attendanceRecord.findFirst.mockResolvedValue(recordWithSso);

      const result = await service.approveOt(
        tenantId,
        'att-1',
        { otMinutesApproved: 90, remarks: 'Approve step 1' },
        'manager-1',
      );

      expect(orchestrator.forwardApprove).toHaveBeenCalledWith(
        'sso-instance-ot-1',
        'manager-1',
        'Approve step 1',
      );
      expect(prisma.attendanceRecord.update).not.toHaveBeenCalled();
      expect(notifications.notifyEmployee).not.toHaveBeenCalled();
      expect(orchestrator.enrichByIds).toHaveBeenCalledWith([recordWithSso]);
      expect(result.otMinutesApproved).toBeNull();
    });

    it('when approvalRequestId exists and applyLocal is true: calls forwardApprove and applies approved OT', async () => {
      const recordWithSso = {
        ...attendanceRecord,
        approvalRequestId: 'sso-instance-ot-1',
      };
      orchestrator.forwardApprove.mockResolvedValue({ applyLocal: true });
      prisma.attendanceRecord.findFirst.mockResolvedValue(recordWithSso);
      prisma.attendanceRecord.update.mockResolvedValue({
        ...recordWithSso,
        otMinutesApproved: 90,
        employee: mockEmployee,
        sessions: [],
      });

      const result = await service.approveOt(
        tenantId,
        'att-1',
        { otMinutesApproved: 90 },
        'manager-1',
      );

      expect(orchestrator.forwardApprove).toHaveBeenCalledWith(
        'sso-instance-ot-1',
        'manager-1',
        undefined,
      );
      expect(prisma.attendanceRecord.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: {
          otMinutesApproved: 90,
          remarks: null,
        },
        include: expect.any(Object),
      });
      expect(notifications.notifyEmployee).toHaveBeenCalled();
      expect(result.otMinutesApproved).toBe(90);
    });

    it('when forwardApprove throws: error propagates and local update is NOT called', async () => {
      const recordWithSso = {
        ...attendanceRecord,
        approvalRequestId: 'sso-instance-ot-1',
      };
      orchestrator.forwardApprove.mockRejectedValue(new Error('SSO approval error'));
      prisma.attendanceRecord.findFirst.mockResolvedValue(recordWithSso);

      await expect(
        service.approveOt(tenantId, 'att-1', { otMinutesApproved: 90 }, 'manager-1'),
      ).rejects.toThrow('SSO approval error');

      expect(prisma.attendanceRecord.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when approved OT exceeds calculated', async () => {
      prisma.attendanceRecord.findFirst.mockResolvedValue(attendanceRecord);

      await expect(
        service.approveOt(tenantId, 'att-1', { otMinutesApproved: 200 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when attendance record not found', async () => {
      prisma.attendanceRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.approveOt(tenantId, 'nonexistent', { otMinutesApproved: 60 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use dto remarks when provided', async () => {
      prisma.attendanceRecord.findFirst.mockResolvedValue(attendanceRecord);
      prisma.attendanceRecord.update.mockResolvedValue({
        ...attendanceRecord,
        otMinutesApproved: 60,
        remarks: 'approved partial',
        employee: mockEmployee,
        sessions: [],
      });

      await service.approveOt(tenantId, 'att-1', {
        otMinutesApproved: 60,
        remarks: 'approved partial',
      });

      expect(prisma.attendanceRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            remarks: 'approved partial',
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------
  // rejectOt
  // -----------------------------------------------------------
  describe('rejectOt', () => {
    const attendanceRecord = {
      id: 'att-1',
      tenantId,
      employeeId,
      date: new Date('2025-01-15'),
      otMinutesCalculated: 120,
      otMinutesApproved: null,
      approvalRequestId: 'sso-instance-ot-1',
      remarks: null,
    };

    it('when approvalRequestId exists: calls forwardReject then sets otMinutesApproved to 0', async () => {
      prisma.attendanceRecord.findFirst.mockResolvedValue(attendanceRecord);
      prisma.attendanceRecord.update.mockResolvedValue({
        ...attendanceRecord,
        otMinutesApproved: 0,
        remarks: 'Rejected OT',
        employee: mockEmployee,
        sessions: [],
      });

      const result = await service.rejectOt(
        tenantId,
        'att-1',
        'Rejected OT',
        'manager-1',
      );

      expect(orchestrator.forwardReject).toHaveBeenCalledWith(
        'sso-instance-ot-1',
        'manager-1',
        'Rejected OT',
      );
      expect(prisma.attendanceRecord.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: {
          otMinutesApproved: 0,
          remarks: 'Rejected OT',
        },
        include: expect.any(Object),
      });
      expect(notifications.notifyEmployee).toHaveBeenCalled();
      expect(result.otMinutesApproved).toBe(0);
    });

    it('when approvalRequestId is null: rejects without forwardReject', async () => {
      const recordWithoutSso = {
        ...attendanceRecord,
        approvalRequestId: null,
      };
      prisma.attendanceRecord.findFirst.mockResolvedValue(recordWithoutSso);
      prisma.attendanceRecord.update.mockResolvedValue({
        ...recordWithoutSso,
        otMinutesApproved: 0,
        employee: mockEmployee,
        sessions: [],
      });

      const result = await service.rejectOt(tenantId, 'att-1');

      expect(orchestrator.forwardReject).not.toHaveBeenCalled();
      expect(prisma.attendanceRecord.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: {
          otMinutesApproved: 0,
          remarks: null,
        },
        include: expect.any(Object),
      });
      expect(result.otMinutesApproved).toBe(0);
    });

    it('when forwardReject throws: error propagates and local update is NOT called', async () => {
      orchestrator.forwardReject.mockRejectedValue(new Error('SSO reject failure'));
      prisma.attendanceRecord.findFirst.mockResolvedValue(attendanceRecord);

      await expect(
        service.rejectOt(tenantId, 'att-1', 'Denied', 'manager-1'),
      ).rejects.toThrow('SSO reject failure');

      expect(prisma.attendanceRecord.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------
  // getPayableHours
  // -----------------------------------------------------------
  describe('getPayableHours', () => {
    it('should throw NotFoundException when employee not found', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.getPayableHours(tenantId, employeeId, {
          from: '2025-01-01',
          to: '2025-01-31',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return payable hours summary for salaried employee', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { status: 'PRESENT', workedMinutes: 480, otMinutesCalculated: 60, otMinutesApproved: 60 },
        { status: 'PRESENT', workedMinutes: 500, otMinutesCalculated: 80, otMinutesApproved: null },
      ]);

      const result = await service.getPayableHours(tenantId, employeeId, {
        from: '2025-01-01',
        to: '2025-01-31',
      });

      expect(result.employeeId).toBe(employeeId);
      expect(result.totalWorkedMinutes).toBe(980);
      expect(result.totalOtMinutesCalculated).toBe(140);
      expect(result.totalOtMinutesApproved).toBe(60);
      expect(result.daysWorked).toBe(2);
      // Salaried employee should NOT have estimatedPay fields
      expect(result.estimatedRegularPay).toBeUndefined();
    });

    it('should calculate estimated pay for hourly employees', async () => {
      const hourlyEmployee = {
        ...mockEmployee,
        payType: 'HOURLY',
        hourlyRate: 25,
        otMultiplier: 1.5,
      };
      prisma.employee.findFirst.mockResolvedValue(hourlyEmployee);
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { status: 'PRESENT', workedMinutes: 480, otMinutesCalculated: 0, otMinutesApproved: 0 },
        { status: 'PRESENT', workedMinutes: 540, otMinutesCalculated: 60, otMinutesApproved: 60 },
      ]);

      const result = await service.getPayableHours(tenantId, employeeId, {
        from: '2025-01-01',
        to: '2025-01-31',
      });

      expect(result.hourlyRate).toBe(25);
      expect(result.otMultiplier).toBe(1.5);
      expect(result.estimatedRegularPay).toBeDefined();
      expect(result.estimatedOtPay).toBeDefined();
      expect(result.estimatedTotalPay).toBeDefined();

      // Verify calculations: regularHours = 1020/60 = 17, otHours = 60/60 = 1
      // regularPay = 17 * 25 = 425, otPay = 1 * 25 * 1.5 = 37.5
      expect(result.estimatedRegularPay).toBe(425);
      expect(result.estimatedOtPay).toBe(37.5);
      expect(result.estimatedTotalPay).toBe(462.5);
    });
  });

  // -----------------------------------------------------------
  // createManualAttendance
  // -----------------------------------------------------------
  describe('createManualAttendance', () => {
    const manualDto = {
      employeeId,
      date: '2025-01-15',
      clockInTime: '2025-01-15T09:00:00Z',
      clockOutTime: '2025-01-15T18:00:00Z',
      breakMinutes: 60,
      status: 'PRESENT' as any,
      remarks: 'manual entry',
    };

    it('should throw NotFoundException when employee not found', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.createManualAttendance(tenantId, manualDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when attendance already exists', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.attendanceRecord.findUnique.mockResolvedValue({ id: 'att-existing' });

      await expect(
        service.createManualAttendance(tenantId, manualDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create manual attendance with worked minutes and OT, and submit to SSO when OT > 0', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.employee.findUnique.mockResolvedValue({
        ...mockEmployee,
        department: { name: 'Operations' },
      });
      prisma.attendanceRecord.findUnique.mockResolvedValue(null);
      otCalc.calculateWorkedMinutes.mockReturnValue(540);
      otCalc.getOtRule.mockResolvedValue(null);
      otCalc.calculateOtMinutes.mockReturnValue(60);

      const created = {
        id: 'att-new',
        tenantId,
        employeeId,
        workedMinutes: 540,
        otMinutesCalculated: 60,
        employee: mockEmployee,
      };
      prisma.attendanceRecord.create.mockResolvedValue(created);

      const result = await service.createManualAttendance(tenantId, manualDto);

      expect(otCalc.calculateWorkedMinutes).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        60,
      );
      expect(prisma.attendanceRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'API',
            standardWorkMinutes: 480,
            otMinutesCalculated: 60,
          }),
        }),
      );
      expect(orchestrator.submitIfLinked).toHaveBeenCalledWith({
        tenantId,
        moduleKey: HRMS_APPROVAL_MODULE.OVERTIME,
        recordId: 'att-new',
        recordNumber: 'OT-ATT-NEW',
        recordAmount: 60,
        submittedByEmployeeId: employeeId,
        contextData: {
          otMinutesCalculated: 60,
          workedMinutes: 540,
          department: { name: 'Operations' },
          date: expect.any(Date),
        },
      });
      expect(result.id).toBe('att-new');
      expect(result.approvalRequestId).toBe('sso-instance-ot-1');
    });

    it('should create manual attendance without clock times (e.g., marking absent)', async () => {
      const absentDto = {
        employeeId,
        date: '2025-01-15',
        status: 'ABSENT' as any,
        remarks: 'absent',
      };

      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.attendanceRecord.findUnique.mockResolvedValue(null);
      prisma.attendanceRecord.create.mockResolvedValue({
        id: 'att-absent',
        employee: mockEmployee,
      });

      await service.createManualAttendance(tenantId, absentDto);

      // calculateWorkedMinutes should NOT be called since no clockIn/clockOut
      expect(otCalc.calculateWorkedMinutes).not.toHaveBeenCalled();
      expect(prisma.attendanceRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workedMinutes: 0,
            otMinutesCalculated: 0,
          }),
        }),
      );
    });
  });
});
