import {
  AttendanceSource,
  AttendanceStatus,
  Employee,
  EmployeeStatus,
  EmploymentType,
  PayType,
  PositionLevel,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { cleanupTransactionData } from './seed-helpers/cleanup-transactions.seed';
import { seedHolidaysAndShifts } from './seed-helpers/holidays-and-shifts.seed';
import { seedLeaveAndAccrual } from './seed-helpers/leave-and-accrual.seed';
import { seedAttendanceAndTimesheet } from './seed-helpers/attendance-and-timesheet.seed';
import { seedPayrollAndSalary } from './seed-helpers/payroll-and-salary.seed';
import { seedExpenses } from './seed-helpers/expenses.seed';
import { seedPerformance } from './seed-helpers/performance.seed';
import { seedOnboardingAndCorporate } from './seed-helpers/onboarding-and-corporate.seed';
import { seedApprovalsAndAdmin } from './seed-helpers/seed-approvals-and-admin.seed';
import { uuid } from './seed-helpers/utils';

const prisma = new PrismaClient();
const tenantId = process.env.DEFAULT_TENANT_ID?.trim() || 'dev-tenant-001';

async function main() {
  console.log('🚀 Seeding master, users, employees, and transactions...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Tenant / Company
  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {
      name: 'PT Nusantara Teknologi',
      code: 'NTK',
      legalName: 'PT Nusantara Teknologi Indonesia',
      email: 'hr@nusantaratech.example.com',
      phone: '021-5550199',
      addressLine1: 'Jl. Jenderal Sudirman Kav. 52',
      city: 'Jakarta Selatan',
      currency: 'IDR',
      officeLatitude: -6.2246,
      officeLongitude: 106.8097,
      officeRadiusMeters: 200,
      isActive: true,
    },
    create: {
      id: tenantId,
      name: 'PT Nusantara Teknologi',
      code: 'NTK',
      legalName: 'PT Nusantara Teknologi Indonesia',
      email: 'hr@nusantaratech.example.com',
      phone: '021-5550199',
      addressLine1: 'Jl. Jenderal Sudirman Kav. 52',
      city: 'Jakarta Selatan',
      currency: 'IDR',
      officeLatitude: -6.2246,
      officeLongitude: 106.8097,
      officeRadiusMeters: 200,
      isActive: true,
    },
  });

  // 2. Branches
  const hqBranch = await prisma.branch.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Kantor Pusat Jakarta' } },
    update: { isActive: true },
    create: {
      tenantId: tenant.id,
      name: 'Kantor Pusat Jakarta',
      type: 'HEAD_OFFICE',
      address: 'Jl. Jenderal Sudirman Kav. 52',
      city: 'Jakarta Selatan',
      country: 'Indonesia',
      latitude: -6.2246,
      longitude: 106.8097,
      radiusMeters: 200,
      isActive: true,
    },
  });

  const bdgBranch = await prisma.branch.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Cabang Bandung' } },
    update: { isActive: true },
    create: {
      tenantId: tenant.id,
      name: 'Cabang Bandung',
      type: 'BRANCH',
      address: 'Jl. Dago No. 88',
      city: 'Bandung',
      country: 'Indonesia',
      latitude: -6.8915,
      longitude: 107.6107,
      radiusMeters: 150,
      isActive: true,
    },
  });

  // 3. Departments (Divisions -> Departments)
  const divTech = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'DIV-TECH' } },
    update: { name: 'Technology & Engineering', classification: 'DIVISION' },
    create: {
      tenantId: tenant.id,
      name: 'Technology & Engineering',
      code: 'DIV-TECH',
      classification: 'DIVISION',
      isActive: true,
    },
  });

  const divOps = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'DIV-OPS' } },
    update: { name: 'People & Operations', classification: 'DIVISION' },
    create: {
      tenantId: tenant.id,
      name: 'People & Operations',
      code: 'DIV-OPS',
      classification: 'DIVISION',
      isActive: true,
    },
  });

  const deptDefs = [
    { code: 'ENG', name: 'Engineering', parentId: divTech.id },
    { code: 'PRD', name: 'Product & Design', parentId: divTech.id },
    { code: 'HRD', name: 'Human Resources', parentId: divOps.id },
    { code: 'FIN', name: 'Finance & Accounting', parentId: divOps.id },
    { code: 'SLS', name: 'Sales & Marketing', parentId: null },
  ];

  const deptByCode = new Map<string, string>();
  for (const d of deptDefs) {
    const dept = await prisma.department.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: d.code } },
      update: { name: d.name, parentId: d.parentId, isActive: true },
      create: {
        tenantId: tenant.id,
        name: d.name,
        code: d.code,
        classification: 'DEPARTMENT',
        parentId: d.parentId,
        isActive: true,
      },
    });
    deptByCode.set(d.code, dept.id);
  }

  // 4. Designations (with hierarchy)
  const upsertDesig = (
    name: string,
    code: string,
    level: PositionLevel,
    departmentId: string | null,
    parentId: string | null,
  ) =>
    prisma.designation.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: { code, level, departmentId, parentId, isActive: true },
      create: {
        tenantId: tenant.id,
        name,
        code,
        level,
        departmentId,
        parentId,
        isActive: true,
      },
    });

  const ceoDesig = await upsertDesig('Chief Executive Officer', 'CEO', PositionLevel.COMPANY, null, null);
  const vpTechDesig = await upsertDesig('VP of Engineering', 'VP-ENG', PositionLevel.DIVISION, divTech.id, ceoDesig.id);
  const engMgrDesig = await upsertDesig('Engineering Manager', 'ENG-MGR', PositionLevel.DEPARTMENT, deptByCode.get('ENG')!, vpTechDesig.id);
  const srEngDesig = await upsertDesig('Senior Software Engineer', 'SR-SWE', PositionLevel.DEPARTMENT, deptByCode.get('ENG')!, engMgrDesig.id);
  const sweDesig = await upsertDesig('Software Engineer', 'SWE', PositionLevel.DEPARTMENT, deptByCode.get('ENG')!, engMgrDesig.id);
  const uxDesig = await upsertDesig('UI/UX Designer', 'UX', PositionLevel.DEPARTMENT, deptByCode.get('PRD')!, vpTechDesig.id);
  const hrMgrDesig = await upsertDesig('HR Manager', 'HR-MGR', PositionLevel.DEPARTMENT, deptByCode.get('HRD')!, ceoDesig.id);
  const hrSpecDesig = await upsertDesig('HR Specialist', 'HR-SPEC', PositionLevel.DEPARTMENT, deptByCode.get('HRD')!, hrMgrDesig.id);
  const finMgrDesig = await upsertDesig('Finance Manager', 'FIN-MGR', PositionLevel.DEPARTMENT, deptByCode.get('FIN')!, ceoDesig.id);
  const accDesig = await upsertDesig('Accountant', 'ACC', PositionLevel.DEPARTMENT, deptByCode.get('FIN')!, finMgrDesig.id);
  const salesDesig = await upsertDesig('Sales Lead', 'SLS-LEAD', PositionLevel.DEPARTMENT, deptByCode.get('SLS')!, ceoDesig.id);

  // 5. Leave Types, Expense Categories, Shift
  const leaveTypes = [
    { code: 'CT', name: 'Cuti Tahunan', defaultDays: 12, isPaid: true, carryForward: true, maxCarryForward: 5 },
    { code: 'CS', name: 'Cuti Sakit', defaultDays: 14, isPaid: true, carryForward: false },
    { code: 'CK', name: 'Cuti Khusus', defaultDays: 3, isPaid: true, carryForward: false },
  ];
  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: lt.code } },
      update: { name: lt.name, defaultDays: lt.defaultDays },
      create: { tenantId: tenant.id, ...lt, isActive: true },
    });
  }

  const expenseCats = [
    { code: 'EXP-TRANS', name: 'Transportasi & Perjalanan Dinas', description: 'Tiket, bensin, tol' },
    { code: 'EXP-HOTEL', name: 'Akomodasi & Hotel Dinas', description: 'Penginapan dinas' },
    { code: 'EXP-MEAL', name: 'Konsumsi & Meeting', description: 'Konsumsi rapat tim' },
    { code: 'EXP-OFFICE', name: 'Perlengkapan Kantor', description: 'ATK dan kebutuhan kerja' },
  ];
  for (const cat of expenseCats) {
    await prisma.expenseCategory.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: cat.code } },
      update: { name: cat.name },
      create: { tenantId: tenant.id, ...cat, isActive: true },
    });
  }

  await prisma.shift.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'REG' } },
    update: { name: 'Shift Regular Kantor (08:00 - 17:00)' },
    create: {
      tenantId: tenant.id,
      name: 'Shift Regular Kantor (08:00 - 17:00)',
      code: 'REG',
      startTime: '08:00',
      endTime: '17:00',
      breakMinutes: 60,
      standardWorkMinutes: 480,
      graceMinutes: 15,
      isActive: true,
    },
  });

  // 6. Employees & Users (with manager hierarchy)
  type EmpSpec = {
    code: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    deptId: string | null;
    desigId: string;
    branchId: string;
    managerCode: string | null;
    employmentType: EmploymentType;
    salary: number;
    joinDate: string;
    gender: string;
  };

  const empSpecs: EmpSpec[] = [
    {
      code: '100001',
      firstName: 'Hendra',
      lastName: 'Wijaya',
      email: 'hendra.wijaya@example.com',
      role: UserRole.SUPER_ADMIN,
      deptId: null,
      desigId: ceoDesig.id,
      branchId: hqBranch.id,
      managerCode: null,
      employmentType: EmploymentType.PERMANENT,
      salary: 45000000,
      joinDate: '2022-01-10',
      gender: 'MALE',
    },
    {
      code: '100002',
      firstName: 'Ratna',
      lastName: 'Kusuma',
      email: 'admin@example.com',
      role: UserRole.HR_ADMIN,
      deptId: deptByCode.get('HRD')!,
      desigId: hrMgrDesig.id,
      branchId: hqBranch.id,
      managerCode: '100001',
      employmentType: EmploymentType.PERMANENT,
      salary: 18500000,
      joinDate: '2023-03-01',
      gender: 'FEMALE',
    },
    {
      code: '100003',
      firstName: 'Bagas',
      lastName: 'Pratama',
      email: 'bagas.pratama@example.com',
      role: UserRole.MANAGER,
      deptId: divTech.id,
      desigId: vpTechDesig.id,
      branchId: hqBranch.id,
      managerCode: '100001',
      employmentType: EmploymentType.PERMANENT,
      salary: 28000000,
      joinDate: '2023-05-15',
      gender: 'MALE',
    },
    {
      code: '100004',
      firstName: 'Dimas',
      lastName: 'Saputra',
      email: 'manager@example.com',
      role: UserRole.MANAGER,
      deptId: deptByCode.get('ENG')!,
      desigId: engMgrDesig.id,
      branchId: hqBranch.id,
      managerCode: '100003',
      employmentType: EmploymentType.PERMANENT,
      salary: 19000000,
      joinDate: '2023-08-01',
      gender: 'MALE',
    },
    {
      code: '100005',
      firstName: 'Budi',
      lastName: 'Santoso',
      email: 'employee@example.com',
      role: UserRole.EMPLOYEE,
      deptId: deptByCode.get('ENG')!,
      desigId: srEngDesig.id,
      branchId: hqBranch.id,
      managerCode: '100004',
      employmentType: EmploymentType.PERMANENT,
      salary: 13500000,
      joinDate: '2024-01-15',
      gender: 'MALE',
    },
    {
      code: '100006',
      firstName: 'Siti',
      lastName: 'Rahmawati',
      email: 'siti.rahma@example.com',
      role: UserRole.EMPLOYEE,
      deptId: deptByCode.get('ENG')!,
      desigId: sweDesig.id,
      branchId: bdgBranch.id,
      managerCode: '100004',
      employmentType: EmploymentType.PERMANENT,
      salary: 10500000,
      joinDate: '2024-06-03',
      gender: 'FEMALE',
    },
    {
      code: '100007',
      firstName: 'Rizky',
      lastName: 'Ananda',
      email: 'rizky.ananda@example.com',
      role: UserRole.EMPLOYEE,
      deptId: deptByCode.get('PRD')!,
      desigId: uxDesig.id,
      branchId: bdgBranch.id,
      managerCode: '100003',
      employmentType: EmploymentType.CONTRACT,
      salary: 11000000,
      joinDate: '2024-09-02',
      gender: 'MALE',
    },
    {
      code: '100008',
      firstName: 'Nadia',
      lastName: 'Putri',
      email: 'nadia.putri@example.com',
      role: UserRole.EMPLOYEE,
      deptId: deptByCode.get('HRD')!,
      desigId: hrSpecDesig.id,
      branchId: hqBranch.id,
      managerCode: '100002',
      employmentType: EmploymentType.PERMANENT,
      salary: 9500000,
      joinDate: '2025-01-06',
      gender: 'FEMALE',
    },
    {
      code: '100009',
      firstName: 'Fajar',
      lastName: 'Nugroho',
      email: 'fajar.nugroho@example.com',
      role: UserRole.MANAGER,
      deptId: deptByCode.get('FIN')!,
      desigId: finMgrDesig.id,
      branchId: hqBranch.id,
      managerCode: '100001',
      employmentType: EmploymentType.PERMANENT,
      salary: 17500000,
      joinDate: '2023-11-01',
      gender: 'MALE',
    },
    {
      code: '100010',
      firstName: 'Dewi',
      lastName: 'Lestari',
      email: 'dewi.lestari@example.com',
      role: UserRole.EMPLOYEE,
      deptId: deptByCode.get('FIN')!,
      desigId: accDesig.id,
      branchId: hqBranch.id,
      managerCode: '100009',
      employmentType: EmploymentType.PERMANENT,
      salary: 9800000,
      joinDate: '2025-02-03',
      gender: 'FEMALE',
    },
    {
      code: '100011',
      firstName: 'Arif',
      lastName: 'Hidayat',
      email: 'arif.hidayat@example.com',
      role: UserRole.EMPLOYEE,
      deptId: deptByCode.get('SLS')!,
      desigId: salesDesig.id,
      branchId: hqBranch.id,
      managerCode: '100001',
      employmentType: EmploymentType.PERMANENT,
      salary: 12000000,
      joinDate: '2024-04-01',
      gender: 'MALE',
    },
  ];

  const empByCode = new Map<string, Employee>();
  for (const spec of empSpecs) {
    const emp = await prisma.employee.upsert({
      where: { tenantId_employeeCode: { tenantId: tenant.id, employeeCode: spec.code } },
      update: {
        firstName: spec.firstName,
        lastName: spec.lastName,
        email: spec.email,
        workEmail: spec.email,
        departmentId: spec.deptId,
        designationId: spec.desigId,
        branchId: spec.branchId,
        employmentType: spec.employmentType,
        payType: PayType.MONTHLY,
        monthlySalary: spec.salary,
        status: EmployeeStatus.ACTIVE,
      },
      create: {
        tenantId: tenant.id,
        employeeCode: spec.code,
        firstName: spec.firstName,
        lastName: spec.lastName,
        email: spec.email,
        workEmail: spec.email,
        phone: '081234567890',
        gender: spec.gender,
        departmentId: spec.deptId,
        designationId: spec.desigId,
        branchId: spec.branchId,
        employmentType: spec.employmentType,
        payType: PayType.MONTHLY,
        monthlySalary: spec.salary,
        joinDate: new Date(`${spec.joinDate}T00:00:00.000Z`),
        status: EmployeeStatus.ACTIVE,
      },
    });
    empByCode.set(spec.code, emp);

    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: spec.email } },
      update: { passwordHash, role: spec.role, employeeId: emp.id, isActive: true },
      create: {
        tenantId: tenant.id,
        email: spec.email,
        passwordHash,
        role: spec.role,
        employeeId: emp.id,
        isActive: true,
      },
    });
  }

  // Link managerId hierarchy
  for (const spec of empSpecs) {
    const emp = empByCode.get(spec.code)!;
    const managerId = spec.managerCode ? empByCode.get(spec.managerCode)?.id ?? null : null;
    await prisma.employee.update({
      where: { id: emp.id },
      data: { managerId },
    });
  }

  const allTenants = [tenant];
  const allEmployees = await prisma.employee.findMany({ where: { tenantId: tenant.id } });
  const allUsers = await prisma.user.findMany({ where: { tenantId: tenant.id } });

  // 7. Transaction Seed via existing helpers
  await cleanupTransactionData(prisma);

  const { holidaysByDate, shiftByTenantId } = await seedHolidaysAndShifts(
    prisma,
    allTenants,
    allEmployees,
  );

  const { approvedLeaveDatesByEmpId } = await seedLeaveAndAccrual(
    prisma,
    allTenants,
    allEmployees,
    holidaysByDate,
  );

  const { attendanceSummaryByEmpMonth } = await seedAttendanceAndTimesheet(
    prisma,
    allTenants,
    allEmployees,
    holidaysByDate,
    shiftByTenantId,
    approvedLeaveDatesByEmpId,
  );

  await seedPayrollAndSalary(
    prisma,
    allTenants,
    allEmployees,
    attendanceSummaryByEmpMonth,
  );

  await seedExpenses(prisma, allTenants, allEmployees);
  await seedPerformance(prisma, allTenants, allEmployees);
  await seedOnboardingAndCorporate(prisma, allTenants, allEmployees, allUsers);
  await seedApprovalsAndAdmin(prisma, allTenants, allEmployees);

  // 8. Seed November 2026 Attendance (so current month Dashboard & Attendance Matrix look populated)
  const regShift = shiftByTenantId.get(tenant.id);
  const novDates = [
    '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
    '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13',
    '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20',
    '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27',
  ];

  const novRecords: Array<Parameters<typeof prisma.attendanceRecord.create>[0]['data']> = [];
  for (const emp of allEmployees) {
    for (let i = 0; i < novDates.length; i++) {
      const dateStr = novDates[i];
      const date = new Date(`${dateStr}T00:00:00.000Z`);
      const isToday = dateStr === '2026-11-27';
      const clockInTime = new Date(`${dateStr}T00:55:00.000Z`); // 07:55 WIB
      const clockOutTime = isToday ? undefined : new Date(`${dateStr}T10:15:00.000Z`); // 17:15 WIB
      novRecords.push({
        id: uuid(),
        tenantId: tenant.id,
        employeeId: emp.id,
        shiftId: regShift?.id ?? undefined,
        date,
        clockInTime,
        clockOutTime,
        status: i % 7 === 3 ? AttendanceStatus.WFH : AttendanceStatus.PRESENT,
        source: AttendanceSource.WEB,
        workedMinutes: isToday ? 0 : 500,
        standardWorkMinutes: 480,
        otMinutesCalculated: isToday ? 0 : (i % 5 === 0 ? 60 : 0),
        otMinutesApproved: isToday ? null : (i % 5 === 0 ? 60 : null),
      });
    }
  }
  await prisma.attendanceRecord.createMany({ data: novRecords, skipDuplicates: true });

  console.log(
    `Docker local seed OK — tenant ${tenant.code}, ${allEmployees.length} employees, Nov 2026 + historical transactions seeded!`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
