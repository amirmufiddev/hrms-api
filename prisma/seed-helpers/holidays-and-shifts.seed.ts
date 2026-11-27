import {
  Employee,
  EmployeeStatus,
  Holiday,
  HolidayType,
  PrismaClient,
  Tenant,
} from '@prisma/client';
import { dateKey, uuid } from './utils';

const NATIONAL_HOLIDAYS: Array<{ date: string; name: string }> = [
  { date: '2025-01-01', name: 'Tahun Baru Masehi' },
  { date: '2025-01-29', name: 'Tahun Baru Imlek' },
  { date: '2025-03-29', name: 'Hari Raya Nyepi' },
  { date: '2025-03-31', name: 'Wafat Isa Almasih' },
  { date: '2025-04-01', name: 'Hari Raya Idul Fitri' },
  { date: '2025-04-02', name: 'Cuti Bersama Idul Fitri' },
  { date: '2025-05-01', name: 'Hari Buruh Internasional' },
  { date: '2025-05-29', name: 'Kenaikan Isa Almasih' },
  { date: '2025-06-01', name: 'Hari Lahir Pancasila' },
  { date: '2025-06-06', name: 'Hari Raya Idul Adha' },
  { date: '2025-08-17', name: 'Hari Kemerdekaan RI' },
  { date: '2025-12-25', name: 'Hari Raya Natal' },
  { date: '2026-01-01', name: 'Tahun Baru Masehi' },
  { date: '2026-02-17', name: 'Tahun Baru Imlek' },
  { date: '2026-03-19', name: 'Hari Raya Nyepi' },
  { date: '2026-04-03', name: 'Wafat Isa Almasih' },
  { date: '2026-04-04', name: 'Hari Raya Idul Fitri' },
  { date: '2026-04-05', name: 'Cuti Bersama Idul Fitri' },
  { date: '2026-05-01', name: 'Hari Buruh Internasional' },
  { date: '2026-05-14', name: 'Kenaikan Isa Almasih' },
  { date: '2026-06-01', name: 'Hari Lahir Pancasila' },
  { date: '2026-05-27', name: 'Hari Raya Idul Adha' },
  { date: '2026-08-17', name: 'Hari Kemerdekaan RI' },
  { date: '2026-12-25', name: 'Hari Raya Natal' },
];

export type HolidaysAndShiftsResult = {
  holidaysByDate: Map<string, Holiday>;
  shiftByTenantId: Map<string, string>;
};

export async function seedHolidaysAndShifts(
  prisma: PrismaClient,
  tenants: Tenant[],
  employees: Employee[],
): Promise<HolidaysAndShiftsResult> {
  console.log('\n📅 Seeding national holidays & shift assignments...');

  const holidaysByDate = new Map<string, Holiday>();
  const shiftByTenantId = new Map<string, string>();

  for (const tenant of tenants) {
    for (const h of NATIONAL_HOLIDAYS) {
      const holidayDate = new Date(`${h.date}T00:00:00.000Z`);
      const holiday = await prisma.holiday.upsert({
        where: {
          tenantId_date_name: {
            tenantId: tenant.id,
            date: holidayDate,
            name: h.name,
          },
        },
        update: { type: HolidayType.NATIONAL, isActive: true },
        create: {
          id: uuid(),
          tenantId: tenant.id,
          name: h.name,
          date: holidayDate,
          type: HolidayType.NATIONAL,
          isActive: true,
        },
      });
      holidaysByDate.set(`${tenant.id}:${dateKey(holidayDate)}`, holiday);
    }

    const shift = await prisma.shift.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'REG' } },
      update: {
        name: 'Shift Regular Kantor (08:00 - 17:00)',
        startTime: '08:00',
        endTime: '17:00',
        breakMinutes: 60,
        standardWorkMinutes: 480,
        graceMinutes: 15,
        isActive: true,
      },
      create: {
        id: uuid(),
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
    shiftByTenantId.set(tenant.id, shift.id);

    const tenantEmployees = employees.filter(
      (e) => e.tenantId === tenant.id && e.status === EmployeeStatus.ACTIVE,
    );

    for (const emp of tenantEmployees) {
      const startDate = emp.joinDate > new Date('2025-01-01')
        ? emp.joinDate
        : new Date('2025-01-01T00:00:00.000Z');

      const existing = await prisma.shiftAssignment.findFirst({
        where: { tenantId: tenant.id, employeeId: emp.id, shiftId: shift.id },
      });

      if (existing) {
        await prisma.shiftAssignment.update({
          where: { id: existing.id },
          data: { isActive: true, startDate, endDate: null },
        });
      } else {
        await prisma.shiftAssignment.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            employeeId: emp.id,
            shiftId: shift.id,
            startDate,
            isActive: true,
          },
        });
      }
    }
  }

  console.log(
    `✅ Holidays: ${NATIONAL_HOLIDAYS.length} per tenant, Shift assignments for active employees.`,
  );

  return { holidaysByDate, shiftByTenantId };
}
