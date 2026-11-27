import {
  AccrualStatus,
  AccrualTriggerType,
  Employee,
  EmployeeStatus,
  LeaveRequestStatus,
  LeaveType,
  PrismaClient,
  Tenant,
} from '@prisma/client';
import {
  SEED_END,
  SEED_START,
  addDays,
  dateKey,
  eachDay,
  isWeekday,
  pickOne,
  seededRandom,
  uuid,
} from './utils';

const LEAVE_REASONS: Record<string, string[]> = {
  CT: [
    'Liburan keluarga ke Bali',
    'Mudik Lebaran ke kampung halaman',
    'Refreshment cuti tahunan',
    'Acara pernikahan saudara',
  ],
  CS: [
    'Demam dan flu, surat dokter terlampir',
    'Istirahat sakit karena migrain',
    'Recovery pasca operasi minor',
  ],
  CK: ['Menghadiri acara duka keluarga', 'Menikahkan adik kandung'],
  UNPAID: ['Keperluan keluarga mendesak tanpa cuti tersisa'],
};

export type LeaveSeedResult = {
  approvedLeaveDatesByEmpId: Map<string, Set<string>>;
  leaveTypesByTenant: Map<string, Map<string, LeaveType>>;
};

function countWeekdays(start: Date, end: Date): number {
  return eachDay(start, end).filter(isWeekday).length;
}

function isHoliday(
  tenantId: string,
  d: Date,
  holidaysByDate: Map<string, { date: Date }>,
): boolean {
  return holidaysByDate.has(`${tenantId}:${dateKey(d)}`);
}

export async function seedLeaveAndAccrual(
  prisma: PrismaClient,
  tenants: Tenant[],
  employees: Employee[],
  holidaysByDate: Map<string, { date: Date }>,
): Promise<LeaveSeedResult> {
  console.log('\n🏖️ Seeding leave balances, accruals & leave requests...');

  const approvedLeaveDatesByEmpId = new Map<string, Set<string>>();
  const leaveTypesByTenant = new Map<string, Map<string, LeaveType>>();

  for (const tenant of tenants) {
    const leaveTypes = await prisma.leaveType.findMany({ where: { tenantId: tenant.id } });
    const ltMap = new Map(leaveTypes.map((lt) => [lt.code, lt]));
    leaveTypesByTenant.set(tenant.id, ltMap);

    const ctType = ltMap.get('CT');
    if (ctType) {
      await prisma.leaveAccrualRule.upsert({
        where: { tenantId_leaveTypeId: { tenantId: tenant.id, leaveTypeId: ctType.id } },
        update: { monthlyAccrualDays: 1, maxBalanceCap: 18, isActive: true },
        create: {
          id: uuid(),
          tenantId: tenant.id,
          leaveTypeId: ctType.id,
          monthlyAccrualDays: 1,
          maxBalanceCap: 18,
          isActive: true,
        },
      });
    }

    const tenantEmployees = employees.filter(
      (e) => e.tenantId === tenant.id && e.status === EmployeeStatus.ACTIVE,
    );

    for (const emp of tenantEmployees) {
      approvedLeaveDatesByEmpId.set(emp.id, new Set());
    }

    for (const year of [2025, 2026]) {
      for (const lt of leaveTypes) {
        for (const emp of tenantEmployees) {
          await prisma.leaveBalance.upsert({
            where: {
              tenantId_employeeId_leaveTypeId_year: {
                tenantId: tenant.id,
                employeeId: emp.id,
                leaveTypeId: lt.id,
                year,
              },
            },
            update: { totalDays: lt.defaultDays },
            create: {
              id: uuid(),
              tenantId: tenant.id,
              employeeId: emp.id,
              leaveTypeId: lt.id,
              year,
              totalDays: lt.defaultDays,
              usedDays: 0,
              pendingDays: 0,
              carriedOver: year === 2026 && lt.carryForward ? 3 : 0,
            },
          });
        }
      }
    }

    // Monthly accrual runs Jan 2025 - Sep 2026
    for (let year = 2025; year <= 2026; year++) {
      const maxMonth = year === 2026 ? 9 : 12;
      for (let month = 1; month <= maxMonth; month++) {
        const run = await prisma.leaveAccrualRun.upsert({
          where: { tenantId_month_year: { tenantId: tenant.id, month, year } },
          update: { status: AccrualStatus.COMPLETED, processedCount: tenantEmployees.length },
          create: {
            id: uuid(),
            tenantId: tenant.id,
            month,
            year,
            fiscalYear: year,
            triggerType: AccrualTriggerType.CRON_JOB,
            status: AccrualStatus.COMPLETED,
            processedCount: tenantEmployees.length,
            completedAt: new Date(`${year}-${String(month).padStart(2, '0')}-02T02:00:00.000Z`),
          },
        });

        if (!ctType) continue;

        for (const emp of tenantEmployees) {
          const balance = await prisma.leaveBalance.findUnique({
            where: {
              tenantId_employeeId_leaveTypeId_year: {
                tenantId: tenant.id,
                employeeId: emp.id,
                leaveTypeId: ctType.id,
                year,
              },
            },
          });
          if (!balance) continue;

          const accrualDays = 1;
          const balanceBefore = Number(balance.totalDays) + Number(balance.carriedOver);
          const balanceAfter = Math.min(balanceBefore + accrualDays, 18);

          await prisma.leaveAccrualEntry.upsert({
            where: {
              accrualRunId_employeeId_leaveTypeId: {
                accrualRunId: run.id,
                employeeId: emp.id,
                leaveTypeId: ctType.id,
              },
            },
            update: { accrualDays, balanceBefore, balanceAfter },
            create: {
              id: uuid(),
              tenantId: tenant.id,
              accrualRunId: run.id,
              employeeId: emp.id,
              leaveTypeId: ctType.id,
              leaveBalanceId: balance.id,
              accrualDays,
              balanceBefore,
              balanceAfter,
              capApplied: balanceAfter >= 18,
            },
          });
        }
      }
    }

    // Leave requests per employee
    for (const emp of tenantEmployees) {
      const requestCount = 3 + Math.floor(seededRandom(`${emp.id}-leave-count`) * 4);
      const managerId = emp.managerId;

      for (let i = 0; i < requestCount; i++) {
        const seed = `${emp.id}-leave-${i}`;
        const rand = seededRandom(seed);
        const daysOffset = Math.floor(rand * 500);
        let start = addDays(SEED_START, daysOffset);
        while (
          !isWeekday(start) ||
          isHoliday(tenant.id, start, holidaysByDate) ||
          start > SEED_END
        ) {
          start = addDays(start, 1);
        }
        if (start > SEED_END) continue;

        const duration = rand < 0.15 ? 5 : rand < 0.4 ? 3 : rand < 0.7 ? 2 : 1;
        let end = addDays(start, duration - 1);

        const leaveCode =
          rand < 0.65 ? 'CT' : rand < 0.85 ? 'CS' : rand < 0.95 ? 'CK' : 'UNPAID';
        const leaveType = ltMap.get(leaveCode);
        if (!leaveType) continue;

        let status: LeaveRequestStatus;
        if (start > new Date('2026-08-01') && rand > 0.85) {
          status = LeaveRequestStatus.PENDING;
        } else if (rand > 0.9) {
          status = LeaveRequestStatus.REJECTED;
        } else {
          status = LeaveRequestStatus.APPROVED;
        }

        const totalDays = countWeekdays(start, end);
        if (totalDays <= 0) continue;

        const reasons = LEAVE_REASONS[leaveCode] ?? ['Cuti karyawan'];
        const reason = pickOne(reasons, seed);

        await prisma.leaveRequest.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            employeeId: emp.id,
            leaveTypeId: leaveType.id,
            startDate: start,
            endDate: end,
            totalDays,
            reason,
            status,
            approverId: managerId,
            approverNote:
              status === LeaveRequestStatus.REJECTED
                ? 'Bentrok dengan deadline proyek penting'
                : status === LeaveRequestStatus.APPROVED
                  ? 'Disetujui, selamat beristirahat'
                  : undefined,
            approvedAt:
              status !== LeaveRequestStatus.PENDING
                ? addDays(start, -3)
                : undefined,
            createdAt: addDays(start, -7),
          },
        });

        if (status === LeaveRequestStatus.APPROVED) {
          const dates = approvedLeaveDatesByEmpId.get(emp.id)!;
          for (const d of eachDay(start, end)) {
            if (isWeekday(d)) dates.add(dateKey(d));
          }

          const balance = await prisma.leaveBalance.findFirst({
            where: {
              tenantId: tenant.id,
              employeeId: emp.id,
              leaveTypeId: leaveType.id,
              year: start.getUTCFullYear(),
            },
          });
          if (balance && leaveType.isPaid) {
            await prisma.leaveBalance.update({
              where: { id: balance.id },
              data: { usedDays: { increment: totalDays } },
            });
          }
        }
      }
    }
  }

  console.log('✅ Leave balances, accruals & requests seeded.');
  return { approvedLeaveDatesByEmpId, leaveTypesByTenant };
}
