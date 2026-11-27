import {
  Employee,
  EmployeeStatus,
  ExpenseClaimStatus,
  PrismaClient,
  Tenant,
} from '@prisma/client';
import { SEED_END, SEED_START, addDays, pickOne, seededRandom, uuid } from './utils';

const EXPENSE_TEMPLATES: Array<{
  categoryCode: string;
  descriptions: string[];
  minAmount: number;
  maxAmount: number;
}> = [
  {
    categoryCode: 'EXP-TRANS',
    descriptions: [
      'Tiket kereta api Jakarta-Bandung rapat klien',
      'Biaya tol dan bensin kunjungan cabang',
      'Grab transportasi meeting dengan vendor',
      'Parkir bandara perjalanan dinas Surabaya',
    ],
    minAmount: 75_000,
    maxAmount: 850_000,
  },
  {
    categoryCode: 'EXP-HOTEL',
    descriptions: [
      'Penginapan hotel 2 malam rapat regional',
      'Akomodasi dinas proyek implementasi ERP',
      'Hotel transit meeting klien Bali',
    ],
    minAmount: 450_000,
    maxAmount: 4_500_000,
  },
  {
    categoryCode: 'EXP-MEAL',
    descriptions: [
      'Jamuan makan meeting dengan rekanan',
      'Konsumsi rapat koordinasi tim proyek',
      'Makan siang meeting klien',
    ],
    minAmount: 150_000,
    maxAmount: 1_200_000,
  },
  {
    categoryCode: 'EXP-OFFICE',
    descriptions: [
      'Pembelian ATK dan supplies kantor',
      'Toner printer dan kertas A4',
      'Perlengkapan meeting room',
    ],
    minAmount: 100_000,
    maxAmount: 750_000,
  },
];

export async function seedExpenses(
  prisma: PrismaClient,
  tenants: Tenant[],
  employees: Employee[],
): Promise<void> {
  console.log('\n🧾 Seeding expense claims...');

  for (const tenant of tenants) {
    const categories = await prisma.expenseCategory.findMany({
      where: { tenantId: tenant.id },
    });
    const catByCode = new Map(categories.map((c) => [c.code, c]));

    const tenantEmployees = employees.filter(
      (e) => e.tenantId === tenant.id && e.status === EmployeeStatus.ACTIVE,
    );

    for (const emp of tenantEmployees) {
      const claimCount = 2 + Math.floor(seededRandom(`${emp.id}-exp`) * 3);

      for (let i = 0; i < claimCount; i++) {
        const seed = `${emp.id}-exp-${i}`;
        const template = pickOne(EXPENSE_TEMPLATES, seed);
        const category = catByCode.get(template.categoryCode);
        if (!category) continue;

        const rand = seededRandom(seed);
        const amount =
          template.minAmount +
          Math.floor(rand * (template.maxAmount - template.minAmount));
        const dayOffset = Math.floor(seededRandom(`${seed}-day`) * 550);
        const expenseDate = addDays(SEED_START, dayOffset);
        if (expenseDate > SEED_END) continue;

        let status: ExpenseClaimStatus;
        if (expenseDate > new Date('2026-08-15') && rand > 0.8) {
          status = ExpenseClaimStatus.SUBMITTED;
        } else if (rand > 0.92) {
          status = ExpenseClaimStatus.REJECTED;
        } else if (rand > 0.75) {
          status = ExpenseClaimStatus.APPROVED;
        } else {
          status = ExpenseClaimStatus.REIMBURSED;
        }

        await prisma.expenseClaim.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            employeeId: emp.id,
            categoryId: category.id,
            amount,
            description: pickOne(template.descriptions, `${seed}-desc`),
            expenseDate,
            status,
            approverId: emp.managerId,
            approverNote:
              status === ExpenseClaimStatus.REJECTED
                ? 'Kwitansi tidak lengkap, mohon upload ulang'
                : status !== ExpenseClaimStatus.SUBMITTED
                  ? 'Disetujui sesuai kebijakan reimbursement'
                  : undefined,
            approvedAt:
              status === ExpenseClaimStatus.APPROVED ||
              status === ExpenseClaimStatus.REIMBURSED
                ? addDays(expenseDate, 3)
                : undefined,
            reimbursedAt:
              status === ExpenseClaimStatus.REIMBURSED
                ? addDays(expenseDate, 10)
                : undefined,
            createdAt: addDays(expenseDate, -1),
          },
        });
      }
    }

    console.log(`  - Tenant ${tenant.code}: expense claims seeded for ${tenantEmployees.length} employees`);
  }

  console.log('✅ Expense claims seeded.');
}
