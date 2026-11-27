/**
 * Hapus semua employee/user HRMS yang terhubung SSO (ssoUserId),
 * lalu provision ulang dari API SSO (sama seperti bagian user di prisma/seed.ts).
 *
 * Pegawai lokal tanpa ssoUserId (mis. daily worker) tidak disentuh.
 *
 * Usage: cd en-hrms-be-fe/backend && tsx scripts/resync-sso-employees.ts
 */
import {
  PrismaClient,
  UserRole,
  EmploymentType,
  PayType,
  EmployeeStatus,
  PunchMatchStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { fetchSsoDirectory } from '../src/common/sso-client/fetch-sso-directory';
import type { SsoUserRaw } from '../src/common/sso-client/fetch-sso-directory';

const hrmsPrisma = new PrismaClient();

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

async function deleteEmployeeWithDependents(employeeId: string, userId?: string) {
  await hrmsPrisma.$transaction(async (tx) => {
    await tx.attendancePunch.updateMany({
      where: { employeeId },
      data: { employeeId: null, matchStatus: PunchMatchStatus.UNMATCHED },
    });
    await tx.employee.updateMany({
      where: { managerId: employeeId },
      data: { managerId: null },
    });
    await tx.leaveRequest.deleteMany({
      where: { OR: [{ employeeId }, { approverId: employeeId }] },
    });
    await tx.goal.deleteMany({
      where: {
        OR: [
          { employeeId },
          { review: { OR: [{ employeeId }, { reviewerId: employeeId }] } },
        ],
      },
    });
    await tx.leaveAccrualEntry.deleteMany({ where: { employeeId } });
    await tx.leaveBalance.deleteMany({ where: { employeeId } });
    await tx.attendanceRecord.deleteMany({ where: { employeeId } });
    await tx.attendanceRegularization.deleteMany({ where: { employeeId } });
    await tx.compOffRequest.deleteMany({ where: { employeeId } });
    await tx.employeeChangeRequest.deleteMany({
      where: { OR: [{ employeeId }, { reviewedBy: employeeId }] },
    });
    await tx.employeeDocument.deleteMany({ where: { employeeId } });
    await tx.employeeSalary.deleteMany({ where: { employeeId } });
    await tx.expenseClaim.deleteMany({
      where: { OR: [{ employeeId }, { approverId: employeeId }] },
    });
    await tx.feedback.deleteMany({
      where: { OR: [{ senderId: employeeId }, { receiverId: employeeId }] },
    });
    await tx.improvementPlan.deleteMany({
      where: { OR: [{ employeeId }, { managerId: employeeId }] },
    });
    await tx.letterGenerated.deleteMany({ where: { employeeId } });
    await tx.onboardingProcess.deleteMany({ where: { employeeId } });
    await tx.onboardingTask.deleteMany({ where: { assigneeId: employeeId } });
    await tx.payslip.deleteMany({ where: { employeeId } });
    await tx.performanceReview.deleteMany({
      where: { OR: [{ employeeId }, { reviewerId: employeeId }] },
    });
    await tx.separation.deleteMany({
      where: { OR: [{ employeeId }, { processedBy: employeeId }] },
    });
    await tx.shiftAssignment.deleteMany({ where: { employeeId } });
    await tx.announcement.deleteMany({ where: { authorId: employeeId } });
    await tx.employee.delete({ where: { id: employeeId } });

    if (userId) {
      await tx.notification.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    }
  });
}

async function deleteSsoLinkedEmployees() {
  const ssoEmployees = await hrmsPrisma.employee.findMany({
    where: { ssoUserId: { not: null } },
    include: { user: { select: { id: true } } },
  });

  console.log(`🗑️  Menghapus ${ssoEmployees.length} employee dengan ssoUserId...`);
  for (const emp of ssoEmployees) {
    await deleteEmployeeWithDependents(emp.id, emp.user?.id);
  }

  const orphanSsoUsers = await hrmsPrisma.user.findMany({
    where: { ssoUserId: { not: null } },
  });
  if (orphanSsoUsers.length > 0) {
    console.log(`🗑️  Menghapus ${orphanSsoUsers.length} user SSO tanpa employee...`);
    for (const u of orphanSsoUsers) {
      await hrmsPrisma.notification.deleteMany({ where: { userId: u.id } });
      await hrmsPrisma.user.delete({ where: { id: u.id } });
    }
  }
}

async function importEmployeesFromSso() {
  const tenants = await hrmsPrisma.tenant.findMany({
    where: { ssoCompanyId: { not: null } },
  });
  const tenantMapBySsoCompanyId = new Map(
    tenants.map((t) => [t.ssoCompanyId as string, t]),
  );
  const primaryTenant =
    tenantMapBySsoCompanyId.get('dd988f4a-af4b-4700-854d-512e2811bb76') ??
    tenants[0];

  const departments = await hrmsPrisma.department.findMany({
    where: { ssoDepartmentId: { not: null } },
  });
  const deptMapBySsoId = new Map(
    departments.map((d) => [d.ssoDepartmentId as string, d]),
  );

  const designations = await hrmsPrisma.designation.findMany({
    where: { ssoPositionId: { not: null } },
  });
  const posMapBySsoId = new Map(
    designations.map((p) => [p.ssoPositionId as string, p]),
  );

  const directory = await fetchSsoDirectory();
  const ssoPositions = directory.positions;
  const ssoUsers: SsoUserRaw[] = directory.users;

  console.log(`📥 Import ${ssoUsers.length} user dari SSO API...`);

  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const employeeMapBySsoUserId = new Map<string, { id: string }>();

  for (const ssoUser of ssoUsers) {
    const tenant =
      (ssoUser.company_id && tenantMapBySsoCompanyId.get(ssoUser.company_id)) ||
      primaryTenant;
    if (!tenant) {
      console.warn(`  ⚠️ Skip ${ssoUser.email}: tidak ada tenant HRMS`);
      continue;
    }

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

  const posToEmpMap = new Map<string, { id: string }>();
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

  const allEmpsForRole = await hrmsPrisma.employee.findMany({
    where: { tenantId: { in: tenants.map((t) => t.id) }, ssoUserId: { not: null } },
    select: { id: true, _count: { select: { directReports: true } } },
  });
  for (const emp of allEmpsForRole) {
    if (emp._count.directReports > 0) {
      await hrmsPrisma.user.updateMany({
        where: { employeeId: emp.id, role: 'EMPLOYEE' },
        data: { role: 'MANAGER' },
      });
    }
  }

  console.log(`✅ Selesai import ${employeeMapBySsoUserId.size} employee dari SSO.`);
}

async function main() {
  const before = await hrmsPrisma.employee.count({
    where: { ssoUserId: { not: null } },
  });
  const localOnly = await hrmsPrisma.employee.count({
    where: { ssoUserId: null },
  });
  console.log(`Sebelum: ${before} employee SSO, ${localOnly} employee lokal (tanpa SSO)`);

  await deleteSsoLinkedEmployees();
  await importEmployeesFromSso();

  const after = await hrmsPrisma.employee.count({
    where: { ssoUserId: { not: null } },
  });
  const localAfter = await hrmsPrisma.employee.count({
    where: { ssoUserId: null },
  });
  console.log(`Sesudah: ${after} employee SSO, ${localAfter} employee lokal (tanpa SSO)`);
}

main()
  .catch((e) => {
    console.error('❌ Resync gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await hrmsPrisma.$disconnect();
  });
