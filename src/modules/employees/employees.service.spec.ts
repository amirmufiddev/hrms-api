import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { buildEmployeeSearchWhere } from './employee-search.util';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { UserSsoClient } from '../../common/sso-client/user-sso.client';
import { createMockPrismaService, createMockEmailService } from '../../test/helpers';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let prisma: any;
  let userSso: jest.Mocked<UserSsoClient>;

  const tenantId = 'test-tenant';

  beforeEach(async () => {
    const mockUserSso = {
      create: jest.fn(),
      update: jest.fn(),
      assignCompany: jest.fn(),
      assignPosition: jest.fn(),
      delete: jest.fn(),
      getUsersByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: PrismaService, useValue: createMockPrismaService() },
        { provide: EmailService, useValue: createMockEmailService() },
        { provide: UserSsoClient, useValue: mockUserSso },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    prisma = module.get(PrismaService);
    userSso = module.get(UserSsoClient);

    if (!prisma.attendanceRecord) {
      prisma.attendanceRecord = {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      };
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Shared fixtures
  // ---------------------------------------------------------------------------

  const mockEmployee = {
    id: 'emp-1',
    tenantId,
    employeeCode: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    phone: '08123456789',
    status: 'ACTIVE',
    employmentType: 'PERMANENT',
    joinDate: new Date('2024-01-15'),
    exitDate: null,
    department: { id: 'dept-1', name: 'Engineering' },
    designation: { id: 'desig-1', name: 'Software Engineer', ssoPositionId: 'sso-pos-1' },
    manager: { id: 'mgr-1', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com' },
    user: { id: 'user-1', ssoUserId: 'sso-user-1', email: 'john@test.com' },
    directReports: [],
  };

  const createDto = {
    employeeCode: '900001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    phone: '08123456789',
    joinDate: '2024-01-15',
    departmentId: 'dept-1',
    designationId: 'desig-1',
  } as any;

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create', () => {
    beforeEach(() => {
      prisma.employee.findMany = jest.fn().mockResolvedValue([]);
      // Mock tenant lookup
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, name: 'Test Corp', ssoCompanyId: 'sso-comp-1' });
    });

    it('should create employee with SSO sync when tenant has ssoCompanyId', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.designation.findFirst.mockResolvedValue({ id: 'desig-1', ssoPositionId: 'sso-pos-1' });
      userSso.create.mockResolvedValue({ id: 'sso-user-1', email: 'john@test.com', name: 'John Doe' });
      userSso.assignCompany.mockResolvedValue(undefined);
      userSso.assignPosition.mockResolvedValue(undefined);

      prisma.user.create.mockResolvedValue({ id: 'user-1', email: 'john@test.com', ssoUserId: 'sso-user-1' });
      prisma.employee.create.mockResolvedValue(mockEmployee);

      const result = await service.create(tenantId, { ...createDto, createSsoUser: true });

      expect(prisma.employee.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId,
          OR: [{ employeeCode: '900001' }, { email: 'john@test.com' }],
        },
      });

      expect(prisma.designation.findFirst).toHaveBeenCalledWith({
        where: { id: 'desig-1', tenantId },
      });

      expect(userSso.create).toHaveBeenCalledWith({
        email: 'john@test.com',
        name: 'John Doe',
        nik: '900001',
      });

      expect(userSso.assignCompany).toHaveBeenCalledWith('sso-user-1', {
        companyId: 'sso-comp-1',
        roleName: 'HRMS Employee',
      });

      expect(userSso.assignPosition).toHaveBeenCalledWith('sso-user-1', 'sso-pos-1');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          email: 'john@test.com',
          ssoUserId: 'sso-user-1',
          role: 'EMPLOYEE',
        }),
      });

      expect(prisma.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          employeeCode: '900001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '08123456789',
        }),
        include: expect.any(Object),
      });

      expect(result).toEqual(mockEmployee);
    });

    it('should create employee locally when tenant has no ssoCompanyId', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, name: 'Local Corp', ssoCompanyId: null });
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-local', email: 'john@test.com', ssoUserId: null });
      prisma.employee.create.mockResolvedValue({ ...mockEmployee, user: null });

      const result = await service.create(tenantId, createDto);

      expect(userSso.create).not.toHaveBeenCalled();
      expect(userSso.assignCompany).not.toHaveBeenCalled();
      expect(userSso.assignPosition).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 'emp-1' }));
    });

    it('tidak membuat user SSO saat createSsoUser tidak dikirim', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-local', email: 'john@test.com', ssoUserId: null });
      prisma.employee.create.mockResolvedValue({ ...mockEmployee, ssoUserId: null });

      await service.create(tenantId, createDto);

      expect(userSso.create).not.toHaveBeenCalled();
    });

    it('menyimpan pegawai lokal tanpa membuat user SSO saat createSsoUser false', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-local', email: 'john@test.com', ssoUserId: null });
      prisma.employee.create.mockResolvedValue({ ...mockEmployee, ssoUserId: null });

      await service.create(tenantId, { ...createDto, createSsoUser: false });

      expect(userSso.create).not.toHaveBeenCalled();
      expect(userSso.assignCompany).not.toHaveBeenCalled();
      expect(userSso.assignPosition).not.toHaveBeenCalled();
      expect(prisma.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ ssoUserId: null, employeeCode: '900001' }),
        include: expect.any(Object),
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ ssoUserId: null, email: 'john@test.com' }),
      });
    });

    it('should throw BadRequestException when employee code does not use 9-prefix format', async () => {
      await expect(
        service.create(tenantId, { ...createDto, employeeCode: '123456' }),
      ).rejects.toThrow('Employee code must be numeric, start with 9, and be 6–10 digits long');
      await expect(
        service.create(tenantId, { ...createDto, employeeCode: '123456' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.employee.findFirst).not.toHaveBeenCalled();
      expect(userSso.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when employee code already exists', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        employeeCode: '900001',
      });

      await expect(service.create(tenantId, createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(tenantId, createDto)).rejects.toThrow(
        'Employee code already exists',
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        employeeCode: 'EMP999',
      });

      await expect(service.create(tenantId, createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(tenantId, createDto)).rejects.toThrow('Email already exists');
    });
  });

  describe('createSsoAccount', () => {
    const localEmployee = {
      ...mockEmployee,
      employeeCode: '900001',
      ssoUserId: null,
      workEmail: null,
      departmentId: 'dept-1',
      designationId: 'desig-1',
      user: { id: 'user-1', email: 'john@test.com', ssoUserId: null, role: 'EMPLOYEE' },
    };

    it('membuat akun SSO dan menyimpan ssoUserId tanpa menghapus pegawai', async () => {
      prisma.employee.findFirst
        .mockResolvedValueOnce(localEmployee)
        .mockResolvedValueOnce({ ...localEmployee, ssoUserId: 'sso-user-1' });
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantId, ssoCompanyId: 'sso-comp-1' });
      prisma.department.findFirst.mockResolvedValue({ id: 'dept-1', ssoDepartmentId: 'sso-dept-1' });
      prisma.designation.findFirst.mockResolvedValue({ id: 'desig-1', ssoPositionId: 'sso-pos-1' });
      userSso.create.mockResolvedValue({ id: 'sso-user-1', email: 'john@test.com', name: 'John Doe' });
      prisma.employee.update.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});

      const result = await service.createSsoAccount(tenantId, 'emp-1');

      expect(userSso.create).toHaveBeenCalledWith({
        email: 'john@test.com',
        name: 'John Doe',
        nik: '900001',
      });
      expect(userSso.assignCompany).toHaveBeenCalledWith('sso-user-1', {
        companyId: 'sso-comp-1',
        roleName: 'HRMS Employee',
      });
      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-1' },
        data: { ssoUserId: 'sso-user-1' },
      });
      expect(prisma.employee.delete).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ ssoUserId: 'sso-user-1' }));
    });

    it('menolak jika akun SSO sudah ada', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...localEmployee,
        ssoUserId: 'sso-user-1',
      });

      await expect(service.createSsoAccount(tenantId, 'emp-1')).rejects.toThrow(
        'SSO account already exists',
      );
      expect(userSso.create).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------

  describe('findAll', () => {
    const mockEmployees = [mockEmployee];

    it('should return paginated employees with default params', async () => {
      prisma.employee.findMany.mockResolvedValue(mockEmployees);
      prisma.employee.count.mockResolvedValue(1);

      const result = await service.findAll(tenantId, {});

      expect(result).toEqual({
        data: mockEmployees,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId },
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should apply search filter', async () => {
      prisma.employee.findMany.mockResolvedValue([]);
      prisma.employee.count.mockResolvedValue(0);

      await service.findAll(tenantId, { search: 'john' });

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            ...buildEmployeeSearchWhere('john'),
          }),
        }),
      );
    });

    it('should apply departmentId, status, and employmentType filters', async () => {
      prisma.employee.findMany.mockResolvedValue([]);
      prisma.employee.count.mockResolvedValue(0);

      await service.findAll(tenantId, {
        departmentId: 'dept-1',
        status: 'ACTIVE' as any,
        employmentType: 'PERMANENT' as any,
      });

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            departmentId: 'dept-1',
            status: 'ACTIVE',
            employmentType: 'PERMANENT',
          }),
        }),
      );
    });

    it('should paginate correctly with custom page and limit', async () => {
      prisma.employee.findMany.mockResolvedValue([]);
      prisma.employee.count.mockResolvedValue(50);

      const result = await service.findAll(tenantId, { page: 3, limit: 10 });

      expect(result.meta).toEqual({
        total: 50,
        page: 3,
        limit: 10,
        totalPages: 5,
      });

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------

  describe('findOne', () => {
    it('should return employee by id', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);

      const result = await service.findOne(tenantId, 'emp-1');

      expect(result).toEqual(mockEmployee);
      expect(prisma.employee.findFirst).toHaveBeenCalledWith({
        where: { id: 'emp-1', tenantId },
        include: expect.objectContaining({
          department: true,
          manager: expect.any(Object),
          directReports: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when employee does not exist', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne(tenantId, 'non-existent')).rejects.toThrow(
        'Employee not found',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // get360View
  // ---------------------------------------------------------------------------

  describe('get360View', () => {
    const mockAttendanceRecords = [
      { status: 'PRESENT', workedMinutes: 480, otMinutesCalculated: 60, otMinutesApproved: 30 },
      { status: 'PRESENT', workedMinutes: 450, otMinutesCalculated: 30, otMinutesApproved: 0 },
      { status: 'ABSENT', workedMinutes: 0, otMinutesCalculated: 0, otMinutesApproved: null },
      { status: 'LEAVE', workedMinutes: 0, otMinutesCalculated: 0, otMinutesApproved: null },
      { status: 'WFH', workedMinutes: 480, otMinutesCalculated: 0, otMinutesApproved: null },
    ];

    const mockLeaveBalances = [
      { id: 'lb-1', leaveType: { name: 'Annual Leave' }, total: 20, used: 5, balance: 15 },
    ];

    it('should return 360 view with aggregated data', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.attendanceRecord.findMany.mockResolvedValue(mockAttendanceRecords);
      prisma.leaveBalance.findMany.mockResolvedValue(mockLeaveBalances);
      prisma.leaveRequest.count.mockResolvedValue(2);

      const result = await service.get360View(tenantId, 'emp-1');

      expect(result.employee).toEqual(mockEmployee);
      expect(result.attendanceSummary).toEqual({
        presentDays: 2,
        absentDays: 1,
        leaveDays: 1,
        wfhDays: 1,
        totalWorkedMinutes: 1410,
        totalOtMinutes: 90,
        totalApprovedOtMinutes: 30,
      });
      expect(result.leaveBalances).toEqual(mockLeaveBalances);
      expect(result.pendingLeaveRequests).toBe(2);

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId,
          employeeId: 'emp-1',
          date: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        }),
      });

      expect(prisma.leaveBalance.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId,
          employeeId: 'emp-1',
          year: new Date().getFullYear(),
        }),
        include: { leaveType: true },
      });

      expect(prisma.leaveRequest.count).toHaveBeenCalledWith({
        where: {
          tenantId,
          employeeId: 'emp-1',
          status: 'PENDING',
        },
      });
    });

    it('should throw NotFoundException when employee does not exist', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(service.get360View(tenantId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    const updateDto = { firstName: 'Johnny', email: 'johnny@test.com', designationId: 'desig-2', phone: '089999999' } as any;

    const updatedEmployee = { ...mockEmployee, firstName: 'Johnny', email: 'johnny@test.com' };

    it('should update employee and sync with SSO successfully', async () => {
      prisma.employee.findFirst
        .mockResolvedValueOnce(mockEmployee) // findOne check with user
        .mockResolvedValueOnce(null); // email conflict check

      prisma.designation.findFirst.mockResolvedValue({ id: 'desig-2', ssoPositionId: 'sso-pos-2' });
      userSso.update.mockResolvedValue(undefined);
      userSso.assignPosition.mockResolvedValue(undefined);

      prisma.employee.update.mockResolvedValue(updatedEmployee);

      const result = await service.update(tenantId, 'emp-1', updateDto);

      expect(userSso.update).toHaveBeenCalledWith('sso-user-1', {
        name: 'Johnny Doe',
      });
      expect(userSso.assignPosition).toHaveBeenCalledWith('sso-user-1', 'sso-pos-2');

      expect(result).toEqual(updatedEmployee);
      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-1' },
        data: expect.objectContaining({
          firstName: 'Johnny',
          email: 'johnny@test.com',
          designationId: 'desig-2',
        }),
        include: expect.objectContaining({
          department: true,
          manager: expect.any(Object),
        }),
      });
    });

    it('reactivates the latest MONTH salary when leaving DAILY_WORKER', async () => {
      prisma.employee.findFirst.mockResolvedValueOnce({
        ...mockEmployee,
        employmentType: 'DAILY_WORKER',
      });
      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        employmentType: 'PERMANENT',
      });
      prisma.employeeSalary.updateMany.mockResolvedValue({ count: 1 });
      prisma.employeeSalary.findFirst.mockResolvedValue({ id: 'es-month' });
      prisma.employeeSalary.update.mockResolvedValue({ id: 'es-month', isActive: true });

      await service.update(tenantId, 'emp-1', { employmentType: 'PERMANENT' } as any);

      expect(prisma.employeeSalary.updateMany).toHaveBeenCalledWith({
        where: { tenantId, employeeId: 'emp-1', isActive: true, payBasis: 'DAILY' },
        data: { isActive: false },
      });
      expect(prisma.employeeSalary.findFirst).toHaveBeenCalledWith({
        where: { tenantId, employeeId: 'emp-1', isActive: false, payBasis: 'MONTH' },
        orderBy: { updatedAt: 'desc' },
      });
      expect(prisma.employeeSalary.update).toHaveBeenCalledWith({
        where: { id: 'es-month' },
        data: { isActive: true },
      });
    });

    it('should throw NotFoundException when employee does not exist', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(service.update(tenantId, 'non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when email conflicts with another employee', async () => {
      prisma.employee.findFirst
        .mockResolvedValueOnce(mockEmployee) // findOne passes
        .mockResolvedValueOnce({ id: 'emp-other', email: 'johnny@test.com' }); // email conflict

      await expect(service.update(tenantId, 'emp-1', updateDto)).rejects.toThrow(
        'Email already exists',
      );
    });

    it('should skip email conflict check when email is not in dto', async () => {
      const nameOnlyDto = { firstName: 'Johnny' } as any;
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.employee.update.mockResolvedValue({ ...mockEmployee, firstName: 'Johnny' });

      await service.update(tenantId, 'emp-1', nameOnlyDto);

      expect(prisma.employee.findFirst).toHaveBeenCalledTimes(1);
    });

    it('clears designation and SSO position when designationId is null', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        designationId: null,
        designation: null,
      });
      userSso.assignPosition.mockResolvedValue(undefined);

      await service.update(tenantId, 'emp-1', { designationId: null } as any);

      expect(userSso.assignPosition).toHaveBeenCalledWith('sso-user-1', null);
      expect(prisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ designationId: null }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe('remove', () => {
    it('menghapus record pegawai, bukan mengubah status menjadi INACTIVE', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.employee.delete.mockResolvedValue(mockEmployee);
      prisma.user.delete.mockResolvedValue({ id: 'user-1' });

      const result = await service.remove(tenantId, 'emp-1');

      expect(prisma.employee.update).not.toHaveBeenCalled();
      expect(prisma.employee.delete).toHaveBeenCalledWith({ where: { id: 'emp-1' } });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(userSso.delete).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: 'Employee deleted successfully' });
    });

    it('melepaskan tap mesin dari pegawai sebelum menghapus record', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.employee.delete.mockResolvedValue(mockEmployee);
      prisma.user.delete.mockResolvedValue({ id: 'user-1' });

      await service.remove(tenantId, 'emp-1');

      expect(prisma.attendancePunch.updateMany).toHaveBeenCalledWith({
        where: { employeeId: 'emp-1' },
        data: { employeeId: null, matchStatus: 'UNMATCHED' },
      });
      expect(prisma.employee.updateMany).toHaveBeenCalledWith({
        where: { managerId: 'emp-1' },
        data: { managerId: null },
      });
    });

    it('should throw NotFoundException when employee does not exist', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // getDirectReports
  // ---------------------------------------------------------------------------

  describe('getDirectReports', () => {
    const mockDirectReports = [
      { id: 'emp-2', firstName: 'Alice', lastName: 'Wonderland', department: { name: 'Engineering' } },
      { id: 'emp-3', firstName: 'Bob', lastName: 'Builder', department: { name: 'Engineering' } },
    ];

    it('should return active direct reports for a manager', async () => {
      prisma.employee.findMany.mockResolvedValue(mockDirectReports);

      const result = await service.getDirectReports(tenantId, 'mgr-1');

      expect(result).toEqual(mockDirectReports);
      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          managerId: 'mgr-1',
          status: 'ACTIVE',
        },
        include: {
          department: true,
        },
      });
    });

    it('should return empty array when manager has no reports', async () => {
      prisma.employee.findMany.mockResolvedValue([]);

      const result = await service.getDirectReports(tenantId, 'mgr-no-reports');

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getOrgChart
  // ---------------------------------------------------------------------------
  describe('getOrgChart', () => {
    it('should build a tree from flat employee list', async () => {
      const employees = [
        {
          id: 'ceo',
          firstName: 'Alice',
          lastName: 'Boss',
          employeeCode: 'CEO001',
          designation: { name: 'CEO' },
          department: { name: 'Executive' },
          managerId: null,
          email: 'alice@test.com',
        },
        {
          id: 'mgr1',
          firstName: 'Bob',
          lastName: 'Manager',
          employeeCode: 'MGR001',
          designation: { name: 'Director' },
          department: { name: 'Engineering' },
          managerId: 'ceo',
          email: 'bob@test.com',
        },
        {
          id: 'dev1',
          firstName: 'Charlie',
          lastName: 'Dev',
          employeeCode: 'DEV001',
          designation: { name: 'Developer' },
          department: { name: 'Engineering' },
          managerId: 'mgr1',
          email: 'charlie@test.com',
        },
      ];
      prisma.employee.findMany.mockResolvedValue(employees);

      const result = await service.getOrgChart(tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice Boss');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].name).toBe('Bob Manager');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].name).toBe('Charlie Dev');
    });

    it('should return empty array when no employees exist', async () => {
      prisma.employee.findMany.mockResolvedValue([]);

      const result = await service.getOrgChart(tenantId);

      expect(result).toEqual([]);
    });

    it('should handle multiple root nodes (no manager)', async () => {
      const employees = [
        {
          id: 'a',
          firstName: 'A',
          lastName: 'Root',
          employeeCode: 'A001',
          designation: null,
          department: null,
          managerId: null,
          email: 'a@test.com',
        },
        {
          id: 'b',
          firstName: 'B',
          lastName: 'Root',
          employeeCode: 'B001',
          designation: null,
          department: null,
          managerId: null,
          email: 'b@test.com',
        },
      ];
      prisma.employee.findMany.mockResolvedValue(employees);

      const result = await service.getOrgChart(tenantId);

      expect(result).toHaveLength(2);
    });

    it('should treat employees with manager outside tenant as roots', async () => {
      const employees = [
        {
          id: 'orphan',
          firstName: 'Orphan',
          lastName: 'Node',
          employeeCode: 'ORP001',
          designation: null,
          department: null,
          managerId: 'external-manager-id',
          email: 'orphan@test.com',
        },
      ];
      prisma.employee.findMany.mockResolvedValue(employees);

      const result = await service.getOrgChart(tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Orphan Node');
    });

    it('should fallback to parent designation holder when managerId is null', async () => {
      const employees = [
        {
          id: 'emp-ceo',
          firstName: 'Alice',
          lastName: 'CEO',
          employeeCode: 'CEO001',
          designationId: 'pos-ceo',
          designation: { id: 'pos-ceo', name: 'CEO', parentId: null, level: 'COMPANY' },
          department: { name: 'Executive' },
          managerId: null,
          email: 'ceo@test.com',
        },
        {
          id: 'emp-mgr',
          firstName: 'Bob',
          lastName: 'Manager',
          employeeCode: 'MGR001',
          designationId: 'pos-mgr',
          designation: { id: 'pos-mgr', name: 'Head of Division', parentId: 'pos-ceo', level: 'DIVISION' },
          department: { name: 'Operations' },
          managerId: null, // No explicit manager, fallback via designation.parentId
          email: 'mgr@test.com',
        },
      ];
      prisma.employee.findMany.mockResolvedValue(employees);

      const result = await service.getOrgChart(tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-ceo');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('emp-mgr');
    });
  });
});
