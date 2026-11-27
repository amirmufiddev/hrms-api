/**
 * Random attendance for N daily workers — full month.
 * Default: 10 workers, Oktober 2026, tenant EEN (first 10 by employeeCode).
 *
 * Run:
 *   npx tsx scripts/seed-daily-workers-attendance.ts
 *   LIMIT=10 YEAR=2026 MONTH=10 npx tsx scripts/seed-daily-workers-attendance.ts
 */

import {
  AttendanceSource,
  AttendanceStatus,
  EmploymentType,
  PrismaClient,
} from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const LIMIT = Number(process.env.LIMIT ?? 10);
const YEAR = Number(process.env.YEAR ?? 2026);
const MONTH = Number(process.env.MONTH ?? 10);
const TENANT_ID = process.env.TENANT_ID ?? '45f39972-f027-440c-ae15-59341f13d33e';

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
) {
  const standard = 480;
  if (
    status === AttendanceStatus.ABSENT ||
    status === AttendanceStatus.LEAVE ||
    status === AttendanceStatus.HOLIDAY
  ) {
    return {
      clockInTime: null as Date | null,
      clockOutTime: null as Date | null,
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
    const ot = rng() < 0.12 ? 60 + Math.floor(rng() * 90) : 0;
    workedMinutes = standard + ot;
    clockOut = new Date(clockIn.getTime() + (workedMinutes + 60) * 60_000);
  }

  return {
    clockInTime: clockIn,
    clockOutTime: clockOut,
    workedMinutes,
    breakMinutes: status === AttendanceStatus.HALF_DAY ? 30 : 60,
    otMinutesCalculated: Math.max(0, workedMinutes - standard),
  };
}

async function seedEmployeeMonth(
  tenantId: string,
  employeeId: string,
  employeeCode: string,
  firstName: string,
  lastName: string,
) {
  const daysInMonth = new Date(YEAR, MONTH, 0).getDate();
  const rng = mulberry32(hashSeed(`${employeeId}-${YEAR}-${MONTH}`));
  const summary: Record<string, number> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const date = dateUtc(YEAR, MONTH, day);
    const status = pickStatus(rng);
    summary[status] = (summary[status] ?? 0) + 1;
    const times = buildClockTimes(date, status, rng);

    await prisma.attendanceRecord.upsert({
      where: {
        tenantId_employeeId_date: { tenantId, employeeId, date },
      },
      update: {
        status,
        source: AttendanceSource.IMPORT,
        standardWorkMinutes: 480,
        ...times,
        remarks: `Seed random ${YEAR}-${String(MONTH).padStart(2, '0')}`,
      },
      create: {
        id: randomUUID(),
        tenantId,
        employeeId,
        date,
        status,
        source: AttendanceSource.IMPORT,
        standardWorkMinutes: 480,
        ...times,
        remarks: `Seed random ${YEAR}-${String(MONTH).padStart(2, '0')}`,
      },
    });
  }

  const payable = await prisma.attendanceRecord.findMany({
    where: {
      tenantId,
      employeeId,
      date: {
        gte: dateUtc(YEAR, MONTH, 1),
        lte: dateUtc(YEAR, MONTH, daysInMonth),
      },
    },
    select: { status: true },
  });
  let units = 0;
  for (const r of payable) {
    if (r.status === 'PRESENT' || r.status === 'WFH') units += 1;
    else if (r.status === 'HALF_DAY') units += 0.5;
  }

  console.log(
    `  ${employeeCode} ${firstName} ${lastName} — ~${units} hari terhitung | status:`,
    summary,
  );
}

async function main() {
  const employees = await prisma.employee.findMany({
    where: {
      tenantId: TENANT_ID,
      status: 'ACTIVE',
      employmentType: EmploymentType.DAILY_WORKER,
    },
    select: {
      id: true,
      tenantId: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { employeeCode: 'asc' },
    take: LIMIT,
  });

  if (employees.length === 0) {
    console.error('Tidak ada DAILY_WORKER aktif untuk tenant', TENANT_ID);
    process.exit(1);
  }

  console.log(
    `🌱 Absensi acak: ${employees.length} daily worker, bulan ${MONTH}/${YEAR}\n`,
  );

  for (const emp of employees) {
    await seedEmployeeMonth(
      emp.tenantId,
      emp.id,
      emp.employeeCode,
      emp.firstName,
      emp.lastName,
    );
  }

  console.log(`\n✅ Selesai — ${employees.length} karyawan × ${new Date(YEAR, MONTH, 0).getDate()} hari`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
