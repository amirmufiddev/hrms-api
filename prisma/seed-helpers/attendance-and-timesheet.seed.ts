import {
  AttendanceSource,
  AttendanceStatus,
  CompOffStatus,
  Employee,
  EmployeeStatus,
  Prisma,
  PrismaClient,
  RegularizationStatus,
  Tenant,
} from '@prisma/client';
import {
  AttendanceMonthSummary,
  SEED_END,
  SEED_START,
  addDays,
  dateKey,
  eachDay,
  isWeekday,
  monthKey,
  seededRandom,
  uuid,
} from './utils';

export type AttendanceSeedResult = {
  attendanceSummaryByEmpMonth: Map<string, AttendanceMonthSummary>;
};

function buildClockTimes(
  date: Date,
  late: boolean,
  overtime: boolean,
): { clockIn: Date; clockOut: Date; workedMinutes: number; otMinutes: number } {
  const clockIn = new Date(date);
  clockIn.setUTCHours(late ? 8 : 7, late ? 20 : 50 + Math.floor(seededRandom(dateKey(date)) * 10), 0, 0);

  const clockOut = new Date(date);
  const otMin = overtime ? 30 + Math.floor(seededRandom(dateKey(date) + 'ot') * 90) : 0;
  clockOut.setUTCHours(17, otMin > 0 ? 0 : 5, 0, 0);
  clockOut.setUTCMinutes(clockOut.getUTCMinutes() + otMin);

  const workedMinutes = 480 + otMin - (late ? 15 : 0);
  return { clockIn, clockOut, workedMinutes, otMinutes: otMin };
}

export async function seedAttendanceAndTimesheet(
  prisma: PrismaClient,
  tenants: Tenant[],
  employees: Employee[],
  holidaysByDate: Map<string, { date: Date }>,
  shiftByTenantId: Map<string, string>,
  approvedLeaveDatesByEmpId: Map<string, Set<string>>,
): Promise<AttendanceSeedResult> {
  console.log('\n⏰ Seeding daily attendance (2025-01-01 – 2026-09-06)...');

  const attendanceSummaryByEmpMonth = new Map<string, AttendanceMonthSummary>();
  const batch: Prisma.AttendanceRecordCreateManyInput[] = [];
  const BATCH_SIZE = 800;

  const flush = async () => {
    if (batch.length === 0) return;
    await prisma.attendanceRecord.createMany({ data: batch, skipDuplicates: true });
    batch.length = 0;
  };

  for (const tenant of tenants) {
    const shiftId = shiftByTenantId.get(tenant.id);
    const tenantEmployees = employees.filter(
      (e) => e.tenantId === tenant.id && e.status === EmployeeStatus.ACTIVE,
    );

    for (const emp of tenantEmployees) {
      const empStart = emp.joinDate > SEED_START ? emp.joinDate : SEED_START;
      const leaveDates = approvedLeaveDatesByEmpId.get(emp.id) ?? new Set();

      for (const day of eachDay(empStart, SEED_END)) {
        const dk = dateKey(day);
        const mk = monthKey(emp.id, day.getUTCFullYear(), day.getUTCMonth() + 1);

        if (!attendanceSummaryByEmpMonth.has(mk)) {
          attendanceSummaryByEmpMonth.set(mk, {
            presentDays: 0,
            leaveDays: 0,
            lopDays: 0,
            otHours: 0,
            workingDays: 0,
            halfDays: 0,
            wfhDays: 0,
          });
        }
        const summary = attendanceSummaryByEmpMonth.get(mk)!;

        const isHol = holidaysByDate.has(`${tenant.id}:${dk}`);
        const isLeave = leaveDates.has(dk);
        const weekday = isWeekday(day);

        if (!weekday && !isHol) continue;

        if (weekday) summary.workingDays += 1;

        let status: AttendanceStatus;
        let clockIn: Date | undefined;
        let clockOut: Date | undefined;
        let workedMinutes = 0;
        let otMinutesCalculated = 0;
        let otMinutesApproved: number | null = null;
        let remarks: string | undefined;

        if (isHol) {
          status = AttendanceStatus.HOLIDAY;
        } else if (isLeave) {
          status = AttendanceStatus.LEAVE;
          summary.leaveDays += 1;
        } else if (!weekday) {
          continue;
        } else {
          const rand = seededRandom(`${emp.id}-${dk}`);
          if (rand < 0.88) {
            status = AttendanceStatus.PRESENT;
            const late = rand < 0.1;
            const overtime = rand > 0.75;
            const times = buildClockTimes(day, late, overtime);
            clockIn = times.clockIn;
            clockOut = times.clockOut;
            workedMinutes = times.workedMinutes;
            otMinutesCalculated = times.otMinutes;
            // OT historis auto-approved; 2 minggu terakhir sebagian pending untuk approval queue
            const isRecent = day >= addDays(SEED_END, -14);
            otMinutesApproved =
              overtime && !isRecent
                ? times.otMinutes
                : overtime && seededRandom(`${emp.id}-${dk}-ot-approve`) > 0.4
                  ? times.otMinutes
                  : null;
            summary.presentDays += 1;
            summary.otHours += times.otMinutes / 60;
          } else if (rand < 0.93) {
            status = AttendanceStatus.WFH;
            const times = buildClockTimes(day, false, false);
            clockIn = times.clockIn;
            clockOut = times.clockOut;
            workedMinutes = 480;
            remarks = 'Work From Home - koordinasi tim remote';
            summary.presentDays += 1;
            summary.wfhDays += 1;
          } else if (rand < 0.95) {
            status = AttendanceStatus.HALF_DAY;
            summary.halfDays += 1;
            summary.presentDays += 0.5;
          } else {
            status = AttendanceStatus.ABSENT;
            summary.lopDays += 1;
          }
        }

        batch.push({
          id: uuid(),
          tenantId: tenant.id,
          employeeId: emp.id,
          date: day,
          shiftId: shiftId ?? undefined,
          clockInTime: clockIn,
          clockOutTime: clockOut,
          workedMinutes,
          standardWorkMinutes: 480,
          otMinutesCalculated,
          otMinutesApproved,
          status,
          source: AttendanceSource.WEB,
          remarks,
        });

        if (batch.length >= BATCH_SIZE) await flush();
      }
    }
  }

  await flush();

  // Regularizations & comp-offs
  for (const tenant of tenants) {
    const tenantEmployees = employees.filter(
      (e) => e.tenantId === tenant.id && e.status === EmployeeStatus.ACTIVE,
    );

    const regTargets = tenantEmployees.slice(0, Math.min(12, tenantEmployees.length));
    for (let i = 0; i < regTargets.length; i++) {
      const emp = regTargets[i];
      const regDate = addDays(SEED_START, 60 + i * 45);
      if (regDate > SEED_END) continue;

      const reqIn = new Date(regDate);
      reqIn.setUTCHours(8, 5, 0, 0);
      const reqOut = new Date(regDate);
      reqOut.setUTCHours(17, 10, 0, 0);

      await prisma.attendanceRegularization.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          employeeId: emp.id,
          date: regDate,
          requestedClockIn: reqIn,
          requestedClockOut: reqOut,
          reason: 'Lupa clock-out karena meeting berlangsung setelah jam kerja',
          status: RegularizationStatus.APPROVED,
          approverId: emp.managerId,
          approvedAt: addDays(regDate, 1),
        },
      });
    }

    const compTargets = tenantEmployees.slice(0, Math.min(8, tenantEmployees.length));
    for (let i = 0; i < compTargets.length; i++) {
      const emp = compTargets[i];
      const workedDate = addDays(SEED_START, 90 + i * 60);
      if (!isWeekday(workedDate)) continue;

      await prisma.compOffRequest.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          employeeId: emp.id,
          workedDate,
          reason: 'Lembur deployment production di akhir pekan',
          earnedDays: 1,
          status: CompOffStatus.APPROVED,
          approverId: emp.managerId,
          approvedAt: addDays(workedDate, 2),
          expiryDate: addDays(workedDate, 90),
        },
      });
    }
  }

  console.log('✅ Attendance records, regularizations & comp-offs seeded.');
  return { attendanceSummaryByEmpMonth };
}
