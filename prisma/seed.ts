import {
  PrismaClient,
  UserRole,
  EmploymentType,
  PayType,
  EmployeeStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { fetchSsoDirectory } from '../src/common/sso-client/fetch-sso-directory';
import type {
  SsoCompanyRaw,
  SsoDeptRaw,
  SsoPosRaw,
  SsoUserRaw,
} from '../src/common/sso-client/fetch-sso-directory';
import { cleanupTransactionData } from './seed-helpers/cleanup-transactions.seed';
import { seedHolidaysAndShifts } from './seed-helpers/holidays-and-shifts.seed';
import { seedLeaveAndAccrual } from './seed-helpers/leave-and-accrual.seed';
import { seedAttendanceAndTimesheet } from './seed-helpers/attendance-and-timesheet.seed';
import { seedPayrollAndSalary } from './seed-helpers/payroll-and-salary.seed';
import { seedExpenses } from './seed-helpers/expenses.seed';
import { seedPerformance } from './seed-helpers/performance.seed';
import { seedOnboardingAndCorporate } from './seed-helpers/onboarding-and-corporate.seed';
import { seedApprovalsAndAdmin } from './seed-helpers/seed-approvals-and-admin.seed';

const hrmsPrisma = new PrismaClient();

// Helper to split display name
function isNumericNik(value: string | null | undefined): value is string {
  return !!value && /^[0-9]+$/.test(value);
}

async function allocateNumericEmployeeCode(
  tenantId: string,
  preferred: string | null | undefined,
  existingCode: string | null | undefined,
): Promise<string> {
  if (isNumericNik(preferred)) return preferred;
  if (isNumericNik(existingCode)) return existingCode;

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    const taken = await hrmsPrisma.employee.findFirst({
      where: { tenantId, employeeCode: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  throw new Error('Gagal membuat NIK angka yang unik');
}

function splitDisplayName(name: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) {
    return { firstName: '-', lastName: '-' };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '-' };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

async function main() {
  console.log('🚀 Starting 100% Real SSO Data Migration to HRMS...');

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // =========================================================================
  // 1. EXTRACT DATA FROM SSO API
  // =========================================================================
  console.log('📥 Extracting live data from SSO API...');

  const directory = await fetchSsoDirectory();
  const ssoCompanies: SsoCompanyRaw[] = directory.companies;
  const ssoDepartments: SsoDeptRaw[] = directory.departments;
  const ssoPositions: SsoPosRaw[] = directory.positions;
  const ssoUsers: SsoUserRaw[] = directory.users;

  console.log(
    `✅ Extracted from SSO: ${ssoCompanies.length} Companies, ${ssoDepartments.length} Departments, ${ssoPositions.length} Positions, ${ssoUsers.length} Users.\n`,
  );

  // =========================================================================
  // 2. MIGRATE COMPANIES -> HRMS TENANTS
  // =========================================================================
  console.log('🏢 Migrating Companies to HRMS Tenants...');
  const tenantMapBySsoCompanyId = new Map<string, any>();

  for (const comp of ssoCompanies) {
    const code = comp.code || `COMP-${comp.id.slice(0, 4)}`.toUpperCase();
    const isEEN = code === 'EEN';

    const tenant = await hrmsPrisma.tenant.upsert({
      where: { ssoCompanyId: comp.id },
      update: {
        name: comp.name,
        code,
        currency: 'IDR',
        officeLatitude: isEEN ? -6.7024 : undefined,
        officeLongitude: isEEN ? 106.9497 : undefined,
        officeRadiusMeters: isEEN ? 200 : 100,
      },
      create: {
        name: comp.name,
        code,
        ssoCompanyId: comp.id,
        currency: 'IDR',
        officeLatitude: isEEN ? -6.7024 : undefined,
        officeLongitude: isEEN ? 106.9497 : undefined,
        officeRadiusMeters: isEEN ? 200 : 100,
      },
    });

    tenantMapBySsoCompanyId.set(comp.id, tenant);
    console.log(`  - Tenant: [${tenant.code}] ${tenant.name} (ID: ${tenant.id})`);
  }

  // Fallback default tenant for users without company
  const primaryTenant = tenantMapBySsoCompanyId.get(
    'dd988f4a-af4b-4700-854d-512e2811bb76',
  ) || Array.from(tenantMapBySsoCompanyId.values())[0];

  // =========================================================================
  // 3. MIGRATE DEPARTMENTS
  // =========================================================================
  console.log(`\n🏛️ Migrating ${ssoDepartments.length} Departments from SSO...`);

  // Clean up legacy departments without ssoDepartmentId
  const legacyDepts = await hrmsPrisma.department.findMany({
    where: { ssoDepartmentId: null },
  });
  if (legacyDepts.length > 0) {
    console.log(`🧹 Cleaning up ${legacyDepts.length} legacy dummy departments...`);
    for (const d of legacyDepts) {
      await hrmsPrisma.designation.updateMany({
        where: { departmentId: d.id },
        data: { departmentId: null },
      });
      await hrmsPrisma.employee.updateMany({
        where: { departmentId: d.id },
        data: { departmentId: null },
      });
      await hrmsPrisma.department.delete({ where: { id: d.id } }).catch(() => null);
    }
  }

  const deptMapBySsoId = new Map<string, any>();

  // Pass 1: Upsert Departments without parent link
  for (const dept of ssoDepartments) {
    const tenant =
      tenantMapBySsoCompanyId.get(dept.company_id) || primaryTenant;
    const code = dept.code || `DEPT-${dept.id.slice(0, 4)}`.toUpperCase();

    const existingBySso = await hrmsPrisma.department.findUnique({
      where: { ssoDepartmentId: dept.id },
    });

    let localDept;
    if (existingBySso) {
      localDept = await hrmsPrisma.department.update({
        where: { id: existingBySso.id },
        data: {
          name: dept.name,
          code,
          classification: dept.classification,
          description: dept.description,
          tenantId: tenant.id,
        },
      });
    } else {
      const existingByCode = await hrmsPrisma.department.findUnique({
        where: { tenantId_code: { tenantId: tenant.id, code } },
      });
      if (existingByCode) {
        localDept = await hrmsPrisma.department.update({
          where: { id: existingByCode.id },
          data: {
            name: dept.name,
            ssoDepartmentId: dept.id,
            classification: dept.classification,
            description: dept.description,
          },
        });
      } else {
        localDept = await hrmsPrisma.department.create({
          data: {
            tenantId: tenant.id,
            name: dept.name,
            code,
            ssoDepartmentId: dept.id,
            classification: dept.classification,
            description: dept.description,
          },
        });
      }
    }
    deptMapBySsoId.set(dept.id, localDept);
  }

  // Pass 2: Link parent departments
  for (const dept of ssoDepartments) {
    const localDept = deptMapBySsoId.get(dept.id);
    if (!localDept) continue;

    const parentLocal = dept.parent_id
      ? deptMapBySsoId.get(dept.parent_id)
      : null;

    await hrmsPrisma.department.update({
      where: { id: localDept.id },
      data: { parentId: parentLocal ? parentLocal.id : null },
    });
  }
  console.log(`✅ Synced ${deptMapBySsoId.size} departments with full hierarchy.`);

  // =========================================================================
  // 4. MIGRATE POSITIONS (STRUKTUR ORGANISASI / JABATAN TREE)
  // =========================================================================
  console.log('\n💼 Migrating 195 Positions from SSO with PositionLevel...');
  const posMapBySsoId = new Map<string, any>();

  // Pass 1: Upsert Positions with deduced level
  for (const pos of ssoPositions) {
    const tenant =
      tenantMapBySsoCompanyId.get(pos.company_id) || primaryTenant;
    const localDept = pos.department_id
      ? deptMapBySsoId.get(pos.department_id)
      : null;

    let level: 'COMPANY' | 'DIVISION' | 'DEPARTMENT' = 'DEPARTMENT';
    if (!localDept) {
      level = 'COMPANY';
    } else if (localDept.classification === 'DIVISION') {
      level = 'DIVISION';
    } else {
      level = 'DEPARTMENT';
    }

    const existingBySso = await hrmsPrisma.designation.findUnique({
      where: { ssoPositionId: pos.id },
    });

    let localPos;
    if (existingBySso) {
      localPos = await hrmsPrisma.designation.update({
        where: { id: existingBySso.id },
        data: {
          name: pos.name,
          code: pos.code,
          departmentId: localDept ? localDept.id : null,
          level,
          tenantId: tenant.id,
        },
      });
    } else {
      const existingByName = await hrmsPrisma.designation.findUnique({
        where: { tenantId_name: { tenantId: tenant.id, name: pos.name } },
      });
      if (existingByName) {
        localPos = await hrmsPrisma.designation.update({
          where: { id: existingByName.id },
          data: {
            code: pos.code,
            ssoPositionId: pos.id,
            departmentId: localDept ? localDept.id : null,
            level,
          },
        });
      } else {
        localPos = await hrmsPrisma.designation.create({
          data: {
            tenantId: tenant.id,
            name: pos.name,
            code: pos.code,
            ssoPositionId: pos.id,
            departmentId: localDept ? localDept.id : null,
            level,
          },
        });
      }
    }
    posMapBySsoId.set(pos.id, localPos);
  }

  // Pass 2: Link parent positions (Line Report Hierarchy)
  for (const pos of ssoPositions) {
    const localPos = posMapBySsoId.get(pos.id);
    if (!localPos) continue;

    const parentLocal = pos.parent_id
      ? posMapBySsoId.get(pos.parent_id)
      : null;

    await hrmsPrisma.designation.update({
      where: { id: localPos.id },
      data: { parentId: parentLocal ? parentLocal.id : null },
    });
  }
  console.log(`✅ Synced ${posMapBySsoId.size} positions with complete Line-Report tree.`);

  // =========================================================================
  // 5. MIGRATE REAL SSO USERS & EMPLOYEES
  // =========================================================================
  console.log('\n👥 Migrating 71 Real SSO Users & Employees...');
  const validSsoUserIds = new Set(ssoUsers.map((u) => u.id));
  const validSsoEmails = new Set(ssoUsers.map((u) => u.email.toLowerCase()));

  // 5.1 Clean up dummy users and employees not present in SSO
  console.log('🧹 Cleaning up local dummy/mock records not in SSO...');
  const allLocalEmployees = await hrmsPrisma.employee.findMany();
  for (const emp of allLocalEmployees) {
    const emailLower = emp.email?.toLowerCase();
    if ((!emailLower || !validSsoEmails.has(emailLower)) && !emp.ssoUserId) {
      // Remove dependent records first if any
      await hrmsPrisma.announcement.deleteMany({ where: { authorId: emp.id } });
      await hrmsPrisma.employeeDocument.deleteMany({ where: { employeeId: emp.id } });
      await hrmsPrisma.employeeChangeRequest.deleteMany({ where: { employeeId: emp.id } });
      await hrmsPrisma.leaveRequest.deleteMany({ where: { OR: [{ employeeId: emp.id }, { approverId: emp.id }] } });
      await hrmsPrisma.leaveBalance.deleteMany({ where: { employeeId: emp.id } });
      await hrmsPrisma.expenseClaim.deleteMany({ where: { OR: [{ employeeId: emp.id }, { approverId: emp.id }] } });
      await hrmsPrisma.shiftAssignment.deleteMany({ where: { employeeId: emp.id } });
      await hrmsPrisma.attendanceRecord.deleteMany({ where: { employeeId: emp.id } });
      await hrmsPrisma.employeeSalary.deleteMany({ where: { employeeId: emp.id } });
      await hrmsPrisma.payslip.deleteMany({ where: { employeeId: emp.id } });
      
      const reviews = await hrmsPrisma.performanceReview.findMany({
        where: { OR: [{ employeeId: emp.id }, { reviewerId: emp.id }] },
      });
      for (const rev of reviews) {
        await hrmsPrisma.goal.deleteMany({ where: { reviewId: rev.id } });
      }
      await hrmsPrisma.goal.deleteMany({ where: { employeeId: emp.id } });
      await hrmsPrisma.performanceReview.deleteMany({ where: { OR: [{ employeeId: emp.id }, { reviewerId: emp.id }] } });
      await hrmsPrisma.onboardingProcess.deleteMany({ where: { employeeId: emp.id } });
      await hrmsPrisma.onboardingTask.deleteMany({ where: { assigneeId: emp.id } });
      
      const localUsers = await hrmsPrisma.user.findMany({ where: { employeeId: emp.id } });
      for (const u of localUsers) {
        await hrmsPrisma.notification.deleteMany({ where: { userId: u.id } });
      }
      await hrmsPrisma.user.deleteMany({ where: { employeeId: emp.id } });
      await hrmsPrisma.employee.delete({ where: { id: emp.id } });
    }
  }

  // 5.2 Pass 1: Upsert Employees and Users
  const employeeMapBySsoUserId = new Map<string, any>();

  for (const ssoUser of ssoUsers) {
    const tenant =
      (ssoUser.company_id && tenantMapBySsoCompanyId.get(ssoUser.company_id)) ||
      primaryTenant;
    const localDept = ssoUser.department_id
      ? deptMapBySsoId.get(ssoUser.department_id)
      : null;
    const localPos = ssoUser.position_id
      ? posMapBySsoId.get(ssoUser.position_id)
      : null;

    const { firstName, lastName } = splitDisplayName(ssoUser.name);

    const role: UserRole =
      ssoUser.role === 'admin' ? UserRole.SUPER_ADMIN : UserRole.EMPLOYEE;

    let emp = await hrmsPrisma.employee.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ ssoUserId: ssoUser.id }, { email: ssoUser.email }],
      },
    });

    const employeeCode = await allocateNumericEmployeeCode(
      tenant.id,
      ssoUser.nik,
      emp?.employeeCode,
    );

    if (emp) {
      emp = await hrmsPrisma.employee.update({
        where: { id: emp.id },
        data: {
          ssoUserId: ssoUser.id,
          employeeCode,
          firstName,
          lastName,
          email: ssoUser.email,
          departmentId: localDept ? localDept.id : null,
          designationId: localPos ? localPos.id : null,
          status: ssoUser.banned ? EmployeeStatus.INACTIVE : EmployeeStatus.ACTIVE,
        },
      });
    } else {
      emp = await hrmsPrisma.employee.create({
        data: {
          tenantId: tenant.id,
          ssoUserId: ssoUser.id,
          employeeCode,
          firstName,
          lastName,
          email: ssoUser.email,
          departmentId: localDept ? localDept.id : null,
          designationId: localPos ? localPos.id : null,
          joinDate: new Date('2024-01-01'),
          employmentType: EmploymentType.PERMANENT,
          payType: PayType.MONTHLY,
          status: ssoUser.banned ? EmployeeStatus.INACTIVE : EmployeeStatus.ACTIVE,
        },
      });
    }

    employeeMapBySsoUserId.set(ssoUser.id, emp);

    // Upsert User
    let user = await hrmsPrisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ ssoUserId: ssoUser.id }, { email: ssoUser.email }],
      },
    });

    if (user) {
      await hrmsPrisma.user.update({
        where: { id: user.id },
        data: {
          ssoUserId: ssoUser.id,
          email: ssoUser.email,
          role,
          employeeId: emp.id,
          isActive: !ssoUser.banned,
        },
      });
    } else {
      await hrmsPrisma.user.create({
        data: {
          tenantId: tenant.id,
          ssoUserId: ssoUser.id,
          email: ssoUser.email,
          passwordHash: defaultPasswordHash,
          role,
          employeeId: emp.id,
          isActive: !ssoUser.banned,
        },
      });
    }
  }

  // 5.3 Pass 2: Connect Manager IDs from Position Line-Report hierarchy
  const posToEmpMap = new Map<string, any>();
  for (const ssoUser of ssoUsers) {
    if (ssoUser.position_id) {
      const emp = employeeMapBySsoUserId.get(ssoUser.id);
      if (emp) posToEmpMap.set(ssoUser.position_id, emp);
    }
  }

  for (const ssoUser of ssoUsers) {
    const emp = employeeMapBySsoUserId.get(ssoUser.id);
    if (!emp || !ssoUser.position_id) continue;

    const ssoPos = ssoPositions.find((p) => p.id === ssoUser.position_id);
    if (ssoPos?.parent_id) {
      const managerEmp = posToEmpMap.get(ssoPos.parent_id);
      if (managerEmp && managerEmp.id !== emp.id) {
        await hrmsPrisma.employee.update({
          where: { id: emp.id },
          data: { managerId: managerEmp.id },
        });
      }
    }
  }

  console.log(`✅ Successfully provisioned ${employeeMapBySsoUserId.size} real employees with manager line-reports.`);

  // Promote User roles based on org hierarchy (manager line-reports)
  const allEmpsForRole = await hrmsPrisma.employee.findMany({
    where: { tenantId: { in: Array.from(tenantMapBySsoCompanyId.values()).map((t) => t.id) } },
    select: { id: true, tenantId: true, _count: { select: { directReports: true } } },
  });
  for (const emp of allEmpsForRole) {
    if (emp._count.directReports > 0) {
      await hrmsPrisma.user.updateMany({
        where: { employeeId: emp.id, role: 'EMPLOYEE' },
        data: { role: 'MANAGER' },
      });
    }
  }

  // =========================================================================
  // 6. MASTER OPERATIONAL DATA (LEAVE TYPES, EXPENSE CATEGORIES, SHIFTS)
  // =========================================================================
  console.log('\n⚙️ Configuring operational masters for tenants...');

  for (const tenant of tenantMapBySsoCompanyId.values()) {
    // Leave types
    const leaveTypes = [
      { code: 'CT', name: 'Cuti Tahunan', defaultDays: 12, isPaid: true, carryForward: true, maxCarryForward: 6 },
      { code: 'CS', name: 'Cuti Sakit', defaultDays: 14, isPaid: true, carryForward: false },
      { code: 'CM', name: 'Cuti Melahirkan', defaultDays: 90, isPaid: true, carryForward: false },
      { code: 'CK', name: 'Cuti Khusus (Menikah/Duka)', defaultDays: 3, isPaid: true, carryForward: false },
      { code: 'UNPAID', name: 'Izin Tanpa Gaji (LOP)', defaultDays: 0, isPaid: false, carryForward: false },
    ];

    for (const lt of leaveTypes) {
      const createdLt = await hrmsPrisma.leaveType.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: lt.code } },
        update: { name: lt.name, defaultDays: lt.defaultDays, isPaid: lt.isPaid },
        create: { tenantId: tenant.id, ...lt },
      });

      // Populate balances for all active employees of this tenant
      const tenantEmployees = await hrmsPrisma.employee.findMany({
        where: { tenantId: tenant.id, status: EmployeeStatus.ACTIVE },
      });

      for (const emp of tenantEmployees) {
        await hrmsPrisma.leaveBalance.upsert({
          where: {
            tenantId_employeeId_leaveTypeId_year: {
              tenantId: tenant.id,
              employeeId: emp.id,
              leaveTypeId: createdLt.id,
              year: 2026,
            },
          },
          update: { totalDays: lt.defaultDays },
          create: {
            tenantId: tenant.id,
            employeeId: emp.id,
            leaveTypeId: createdLt.id,
            year: 2026,
            totalDays: lt.defaultDays,
            usedDays: 0,
            pendingDays: 0,
            carriedOver: 0,
          },
        });
      }
    }

    // Expense Categories
    const expenseCats = [
      { code: 'EXP-TRANS', name: 'Transportasi & Perjalanan Dinas', description: 'Tiket transportasi, bensin, tol' },
      { code: 'EXP-HOTEL', name: 'Akomodasi & Hotel Dinas', description: 'Penginapan dan hotel luar kota' },
      { code: 'EXP-MEAL', name: 'Konsumsi & Jamuan Rekanan', description: 'Meeting bisnis & jamuan' },
      { code: 'EXP-OFFICE', name: 'Perlengkapan & ATK Kantor', description: 'Kebutuhan operasional kantor' },
    ];

    for (const cat of expenseCats) {
      await hrmsPrisma.expenseCategory.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: cat.code } },
        update: { name: cat.name },
        create: { tenantId: tenant.id, ...cat },
      });
    }

    // Shifts
    await hrmsPrisma.shift.upsert({
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
  }

  console.log('✅ Configured operational leave types, expense categories, and shifts.');

  // =========================================================================
  // 7. REALISTIC TRANSACTION DATA (2025-01-01 s/d 2026-09-06)
  // =========================================================================
  const allTenants = Array.from(tenantMapBySsoCompanyId.values());
  const allEmployees = await hrmsPrisma.employee.findMany({
    where: { tenantId: { in: allTenants.map((t) => t.id) } },
  });
  const allUsers = await hrmsPrisma.user.findMany({
    where: { tenantId: { in: allTenants.map((t) => t.id) } },
  });

  await cleanupTransactionData(hrmsPrisma);

  const { holidaysByDate, shiftByTenantId } = await seedHolidaysAndShifts(
    hrmsPrisma,
    allTenants,
    allEmployees,
  );

  const { approvedLeaveDatesByEmpId } = await seedLeaveAndAccrual(
    hrmsPrisma,
    allTenants,
    allEmployees,
    holidaysByDate,
  );

  const { attendanceSummaryByEmpMonth } = await seedAttendanceAndTimesheet(
    hrmsPrisma,
    allTenants,
    allEmployees,
    holidaysByDate,
    shiftByTenantId,
    approvedLeaveDatesByEmpId,
  );

  await seedPayrollAndSalary(
    hrmsPrisma,
    allTenants,
    allEmployees,
    attendanceSummaryByEmpMonth,
  );

  await seedExpenses(hrmsPrisma, allTenants, allEmployees);
  await seedPerformance(hrmsPrisma, allTenants, allEmployees);
  await seedOnboardingAndCorporate(hrmsPrisma, allTenants, allEmployees, allUsers);
  await seedApprovalsAndAdmin(hrmsPrisma, allTenants, allEmployees);

  console.log('\n=============================================================');
  console.log('🎉 100% REAL SSO DATA + TRANSACTION SEED COMPLETED! 🎉');
  console.log('=============================================================');
  console.log(`Total Tenants      : ${tenantMapBySsoCompanyId.size}`);
  console.log(`Total Departments  : ${deptMapBySsoId.size}`);
  console.log(`Total Positions    : ${posMapBySsoId.size}`);
  console.log(`Total Real Users   : ${employeeMapBySsoUserId.size}`);
  console.log(`Total Employees    : ${allEmployees.length}`);
  console.log(`Period             : 2025-01-01 → 2026-09-06`);
  console.log('=============================================================');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await hrmsPrisma.$disconnect();
  });
