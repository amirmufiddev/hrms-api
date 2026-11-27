import {
  Employee,
  EmployeeStatus,
  PayrollRunKind,
  PayrollRunStatus,
  PositionLevel,
  Prisma,
  PrismaClient,
  Tenant,
} from '@prisma/client';
import { AttendanceMonthSummary, monthKey, uuid } from './utils';

const SALARY_BY_LEVEL: Record<PositionLevel, { min: number; max: number }> = {
  COMPANY: { min: 35_000_000, max: 55_000_000 },
  DIVISION: { min: 22_000_000, max: 32_000_000 },
  DEPARTMENT: { min: 14_000_000, max: 20_000_000 },
};

const DEFAULT_STAFF_SALARY = { min: 8_000_000, max: 13_000_000 };

function resolveBasePay(level: PositionLevel | null, employeeId: string): number {
  const range = level ? SALARY_BY_LEVEL[level] : DEFAULT_STAFF_SALARY;
  const hash = employeeId.charCodeAt(0) + employeeId.charCodeAt(employeeId.length - 1);
  const spread = range.max - range.min;
  return range.min + (hash % 100) * (spread / 100);
}

function calcComponents(basePay: number) {
  const tunjanganMakan = Math.round(basePay * 0.1);
  const tunjanganTransport = Math.round(basePay * 0.1);
  const tunjanganJabatan = Math.round(basePay * 0.05);
  const bpjsTk = Math.round(basePay * 0.03);
  const bpjsKes = Math.round(basePay * 0.01);
  const pph21 = Math.round(basePay * 0.035);

  const earnings = [
    { name: 'Gaji Pokok', amount: basePay },
    { name: 'Tunjangan Makan', amount: tunjanganMakan },
    { name: 'Tunjangan Transport', amount: tunjanganTransport },
    { name: 'Tunjangan Jabatan', amount: tunjanganJabatan },
  ];
  const deductions = [
    { name: 'BPJS Ketenagakerjaan', amount: bpjsTk },
    { name: 'BPJS Kesehatan', amount: bpjsKes },
    { name: 'PPh 21', amount: pph21 },
  ];

  const grossPay = earnings.reduce((s, e) => s + e.amount, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  return { earnings, deductions, grossPay, totalDeductions, netPay: grossPay - totalDeductions };
}

export async function seedPayrollAndSalary(
  prisma: PrismaClient,
  tenants: Tenant[],
  employees: Employee[],
  attendanceSummaryByEmpMonth: Map<string, AttendanceMonthSummary>,
): Promise<void> {
  console.log('\n💰 Seeding salary structures, payroll runs & payslips...');

  for (const tenant of tenants) {
    const structureComponents = [
      { name: 'Tunjangan Makan', type: 'earning', calcType: 'percentage', value: 10 },
      { name: 'Tunjangan Transport', type: 'earning', calcType: 'percentage', value: 10 },
      { name: 'Tunjangan Jabatan', type: 'earning', calcType: 'percentage', value: 5 },
      { name: 'BPJS Ketenagakerjaan', type: 'deduction', calcType: 'percentage', value: 3 },
      { name: 'BPJS Kesehatan', type: 'deduction', calcType: 'percentage', value: 1 },
      { name: 'PPh 21', type: 'deduction', calcType: 'percentage', value: 3.5 },
    ];

    const structure = await prisma.salaryStructure.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: 'Struktur Gaji Standar Indonesia' } },
      update: { components: structureComponents as unknown as Prisma.InputJsonValue },
      create: {
        id: uuid(),
        tenantId: tenant.id,
        name: 'Struktur Gaji Standar Indonesia',
        description: 'Gaji pokok + tunjangan + potongan BPJS & PPh 21',
        components: structureComponents as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    const tenantEmployees = employees.filter(
      (e) => e.tenantId === tenant.id && e.status === EmployeeStatus.ACTIVE,
    );

    const designationLevels = new Map<string, PositionLevel>();
    const designations = await prisma.designation.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, level: true },
    });
    for (const d of designations) designationLevels.set(d.id, d.level);

    for (const emp of tenantEmployees) {
      const level = emp.designationId ? designationLevels.get(emp.designationId) : null;
      const basePay =
        emp.monthlySalary != null
          ? Number(emp.monthlySalary)
          : resolveBasePay(level ?? null, emp.id);

      if (emp.monthlySalary == null) {
        await prisma.employee.update({
          where: { id: emp.id },
          data: { monthlySalary: basePay },
        });
      }

      const existingSalary = await prisma.employeeSalary.findFirst({
        where: { tenantId: tenant.id, employeeId: emp.id, isActive: true },
      });

      if (!existingSalary) {
        await prisma.employeeSalary.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            employeeId: emp.id,
            salaryStructureId: structure.id,
            basePay,
            effectiveFrom: new Date('2025-01-01T00:00:00.000Z'),
            isActive: true,
          },
        });
      }
    }

    // Payroll runs: Jan 2025 - Sep 2026
    for (let year = 2025; year <= 2026; year++) {
      const maxMonth = year === 2026 ? 9 : 12;
      for (let month = 1; month <= maxMonth; month++) {
        const isCurrentMonth = year === 2026 && month === 9;
        const status = isCurrentMonth
          ? PayrollRunStatus.COMPUTED
          : PayrollRunStatus.PAID;

        const existingRun = await prisma.payrollRun.findFirst({
          where: {
            tenantId: tenant.id,
            kind: PayrollRunKind.MONTHLY,
            month,
            year,
          },
        });

        const run = existingRun
          ? await prisma.payrollRun.update({
              where: { id: existingRun.id },
              data: { status },
            })
          : await prisma.payrollRun.create({
              data: {
                id: uuid(),
                tenantId: tenant.id,
                kind: PayrollRunKind.MONTHLY,
                month,
                year,
                status,
                processedAt: isCurrentMonth
                  ? undefined
                  : new Date(`${year}-${String(month).padStart(2, '0')}-28T10:00:00.000Z`),
                approvedAt: isCurrentMonth
                  ? undefined
                  : new Date(`${year}-${String(month).padStart(2, '0')}-28T14:00:00.000Z`),
              },
            });

        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        let processedCount = 0;

        for (const emp of tenantEmployees) {
          const empSalary = await prisma.employeeSalary.findFirst({
            where: { tenantId: tenant.id, employeeId: emp.id, isActive: true },
          });
          if (!empSalary) continue;

          const basePay = Number(empSalary.basePay);
          const mk = monthKey(emp.id, year, month);
          const att = attendanceSummaryByEmpMonth.get(mk) ?? {
            presentDays: 20,
            leaveDays: 1,
            lopDays: 0,
            otHours: 0,
            workingDays: 22,
            halfDays: 0,
            wfhDays: 0,
          };

          const hourlyRate = basePay / 173;
          const otPay = Math.round(hourlyRate * 1.5 * att.otHours);
          const lopDeduction =
            att.lopDays > 0 ? Math.round((basePay / att.workingDays) * att.lopDays) : 0;

          const { earnings, deductions, grossPay, totalDeductions: empDeductions, netPay } =
            calcComponents(basePay);

          if (otPay > 0) earnings.push({ name: 'Lembur', amount: otPay });
          if (lopDeduction > 0) deductions.push({ name: 'Potongan Mangkir (LOP)', amount: lopDeduction });

          const finalGross = grossPay + otPay;
          const finalDeductions = empDeductions + lopDeduction;
          const finalNet = finalGross - finalDeductions;

          await prisma.payslip.upsert({
            where: { payrollRunId_employeeId: { payrollRunId: run.id, employeeId: emp.id } },
            update: {
              workingDays: att.workingDays,
              presentDays: Math.round(att.presentDays),
              leaveDays: att.leaveDays,
              lopDays: att.lopDays,
              otHours: att.otHours,
              basePay,
              earnings: earnings as unknown as Prisma.InputJsonValue,
              deductions: deductions as unknown as Prisma.InputJsonValue,
              grossPay: finalGross,
              totalDeductions: finalDeductions,
              netPay: finalNet,
              otPay,
            },
            create: {
              id: uuid(),
              tenantId: tenant.id,
              payrollRunId: run.id,
              employeeId: emp.id,
              workingDays: att.workingDays,
              presentDays: Math.round(att.presentDays),
              leaveDays: att.leaveDays,
              lopDays: att.lopDays,
              otHours: att.otHours,
              basePay,
              earnings: earnings as unknown as Prisma.InputJsonValue,
              deductions: deductions as unknown as Prisma.InputJsonValue,
              grossPay: finalGross,
              totalDeductions: finalDeductions,
              netPay: finalNet,
              otPay,
            },
          });

          totalGross += finalGross;
          totalDeductions += finalDeductions;
          totalNet += finalNet;
          processedCount += 1;
        }

        await prisma.payrollRun.update({
          where: { id: run.id },
          data: { totalGross, totalDeductions, totalNet, processedCount },
        });
      }
    }
  }

  console.log('✅ Payroll runs & payslips seeded (Jan 2025 – Sep 2026).');
}
