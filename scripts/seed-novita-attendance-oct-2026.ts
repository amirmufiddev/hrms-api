/**
 * Random attendance for NOVITA SARI (900003) — October 2026.
 * Run: npx tsx scripts/seed-novita-attendance-oct-2026.ts
 */

import { AttendanceSource, AttendanceStatus, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const EMPLOYEE_ID = 'e9495ad8-0cd5-4954-9f40-e54b0d1d8f7c';
const TENANT_ID = '45f39972-f027-440c-ae15-59341f13d33e';
const YEAR = 2026;
const MONTH = 10;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateUtc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

function pickStatus(rng: () => number): AttendanceStatus {
  const x = rng();
  if (x < 0.62) return AttendanceStatus.PRESENT;
  if (x < 0.72) return AttendanceStatus.WFH;
  if (x < 0.8) return AttendanceStatus.HALF_DAY;
  if (x < 0.9) return AttendanceStatus.ABSENT;
  if (x < 0.96) return AttendanceStatus.LEAVE;
  return AttendanceStatus.HOLIDAY;
}

function buildClockTimes(
  date: Date,
  status: AttendanceStatus,
  rng: () => number,
): {
  clockInTime: Date | null;
  clockOutTime: Date | null;
  workedMinutes: number;
  breakMinutes: number;
  otMinutesCalculated: number;
} {
  const standard = 480;
  if (
    status === AttendanceStatus.ABSENT ||
    status === AttendanceStatus.LEAVE ||
    status === AttendanceStatus.HOLIDAY
  ) {
    return {
      clockInTime: null,
      clockOutTime: null,
      workedMinutes: 0,
      breakMinutes: 0,
      otMinutesCalculated: 0,
    };
  }

  const inHour = 8 + Math.floor(rng() * 2);
  const inMin = Math.floor(rng() * 4) * 15;
  const clockIn = new Date(date);
  clockIn.setUTCHours(inHour, inMin, 0, 0);

  let workedMinutes: number;
  let clockOut: Date;

  if (status === AttendanceStatus.HALF_DAY) {
    workedMinutes = 240;
    clockOut = new Date(clockIn.getTime() + (workedMinutes + 30) * 60_000);
  } else if (status === AttendanceStatus.WFH) {
    workedMinutes = standard;
    clockOut = new Date(clockIn.getTime() + (workedMinutes + 60) * 60_000);
  } else {
    const ot = rng() < 0.15 ? 60 + Math.floor(rng() * 120) : 0;
    workedMinutes = standard + ot;
    clockOut = new Date(clockIn.getTime() + (workedMinutes + 60) * 60_000);
  }

  const otMinutesCalculated = Math.max(0, workedMinutes - standard);

  return {
    clockInTime: clockIn,
    clockOutTime: clockOut,
    workedMinutes,
    breakMinutes: status === AttendanceStatus.HALF_DAY ? 30 : 60,
    otMinutesCalculated,
  };
}

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { id: EMPLOYEE_ID, tenantId: TENANT_ID },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
  });

  if (!emp) {
    console.error('Employee NOVITA SARI (900003) not found.');
    process.exit(1);
  }

  const rng = mulberry32(20261029);
  const daysInMonth = 31;
  const summary: Record<string, number> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const date = dateUtc(YEAR, MONTH, day);
    const status = pickStatus(rng);
    summary[status] = (summary[status] ?? 0) + 1;

    const times = buildClockTimes(date, status, rng);

    await prisma.attendanceRecord.upsert({
      where: {
        tenantId_employeeId_date: {
          tenantId: TENANT_ID,
          employeeId: emp.id,
          date,
        },
      },
      update: {
        status,
        source: AttendanceSource.IMPORT,
        standardWorkMinutes: 480,
        ...times,
        remarks: 'Seed random Oct 2026',
      },
      create: {
        id: randomUUID(),
        tenantId: TENANT_ID,
        employeeId: emp.id,
        date,
        status,
        source: AttendanceSource.IMPORT,
        standardWorkMinutes: 480,
        ...times,
        remarks: 'Seed random Oct 2026',
      },
    });
  }

  console.log(
    `✅ Attendance Oktober ${YEAR} untuk ${emp.firstName} ${emp.lastName} (${emp.employeeCode}): ${daysInMonth} hari`,
  );
  console.log('   Status:', summary);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
