import {
  Employee,
  EmployeeStatus,
  FeedbackType,
  FeedbackVisibility,
  GoalStatus,
  PerformanceReviewStatus,
  PrismaClient,
  ReviewCycleStatus,
  Tenant,
} from '@prisma/client';
import { addDays, pickOne, seededRandom, uuid } from './utils';

const KPI_TEMPLATES = [
  'Menyelesaikan migrasi arsitektur microservices sesuai timeline',
  'Meningkatkan uptime sistem produksi menjadi 99.9%',
  'Mengoptimasi biaya infrastruktur cloud minimal 15%',
  'Menyelesaikan audit keamanan ISO 27001 tanpa finding mayor',
  'Meningkatkan NPS internal tim minimal 20 poin',
  'Implementasi modul HRMS terintegrasi SSO end-to-end',
  'Mengurangi bug production di modul payroll hingga 30%',
  'Memimpin rollout POS mobile ke 5 cabang baru',
];

const MANAGER_COMMENTS = [
  'Kinerja konsisten dan proaktif menyelesaikan blocker tim.',
  'Perlu peningkatan komunikasi lintas departemen.',
  'Sangat baik dalam delivery proyek dan mentoring junior.',
  'Memenuhi target dengan kualitas di atas ekspektasi.',
  'Rekomendasi untuk program leadership development.',
];

export async function seedPerformance(
  prisma: PrismaClient,
  tenants: Tenant[],
  employees: Employee[],
): Promise<void> {
  console.log('\n📊 Seeding performance reviews, goals & feedback...');

  for (const tenant of tenants) {
    const cycles = [
      {
        name: 'Annual Performance Review 2025',
        startDate: new Date('2025-01-01T00:00:00.000Z'),
        endDate: new Date('2025-12-31T00:00:00.000Z'),
        status: ReviewCycleStatus.COMPLETED,
      },
      {
        name: 'Mid-Year Review 2026',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-06-30T00:00:00.000Z'),
        status: ReviewCycleStatus.COMPLETED,
      },
      {
        name: 'Q3 Performance Review 2026',
        startDate: new Date('2026-07-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T00:00:00.000Z'),
        status: ReviewCycleStatus.ACTIVE,
      },
    ];

    const cycleRecords = [];
    for (const c of cycles) {
      const cycle = await prisma.reviewCycle.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: c.name } },
        update: { status: c.status },
        create: {
          id: uuid(),
          tenantId: tenant.id,
          name: c.name,
          description: `Siklus evaluasi kinerja ${c.name}`,
          startDate: c.startDate,
          endDate: c.endDate,
          status: c.status,
        },
      });
      cycleRecords.push(cycle);
    }

    const tenantEmployees = employees.filter(
      (e) => e.tenantId === tenant.id && e.status === EmployeeStatus.ACTIVE,
    );

    for (const cycle of cycleRecords) {
      for (const emp of tenantEmployees) {
        const reviewerId = emp.managerId ?? emp.id;
        const rand = seededRandom(`${emp.id}-${cycle.id}`);
        const selfRating = 3 + Math.floor(rand * 3);
        const managerRating = Math.max(3, Math.min(5, selfRating + (rand > 0.5 ? 0 : -1)));

        const isActiveCycle = cycle.status === ReviewCycleStatus.ACTIVE;
        const reviewStatus = isActiveCycle
          ? PerformanceReviewStatus.MANAGER_REVIEW
          : PerformanceReviewStatus.COMPLETED;

        const review = await prisma.performanceReview.upsert({
          where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: emp.id } },
          update: {
            status: reviewStatus,
            selfRating,
            managerRating: isActiveCycle ? undefined : managerRating,
            overallRating: isActiveCycle ? undefined : managerRating,
          },
          create: {
            id: uuid(),
            tenantId: tenant.id,
            cycleId: cycle.id,
            employeeId: emp.id,
            reviewerId,
            status: reviewStatus,
            selfRating,
            selfComments: 'Saya telah menyelesaikan target utama sesuai rencana kerja.',
            managerRating: isActiveCycle ? undefined : managerRating,
            managerComments: isActiveCycle
              ? undefined
              : pickOne(MANAGER_COMMENTS, `${emp.id}-mgr`),
            overallRating: isActiveCycle ? undefined : managerRating,
            selfSubmittedAt: addDays(cycle.startDate, 14),
            managerSubmittedAt: isActiveCycle
              ? undefined
              : addDays(cycle.startDate, 30),
          },
        });

        const goalCount = 2 + Math.floor(seededRandom(`${emp.id}-goals`) * 3);
        for (let g = 0; g < goalCount; g++) {
          const gSeed = `${emp.id}-${cycle.id}-goal-${g}`;
          const progress = isActiveCycle
            ? 30 + Math.floor(seededRandom(gSeed) * 50)
            : 100;
          const status =
            progress >= 100 ? GoalStatus.COMPLETED : GoalStatus.IN_PROGRESS;

          await prisma.goal.create({
            data: {
              id: uuid(),
              tenantId: tenant.id,
              reviewId: review.id,
              employeeId: emp.id,
              title: pickOne(KPI_TEMPLATES, gSeed),
              description: 'Target kinerja individu untuk periode review ini.',
              targetDate: cycle.endDate,
              status,
              progress,
              weight: 1,
            },
          });
        }
      }
    }

    // 360 feedback
    const feedbackPairs = tenantEmployees.slice(0, Math.min(20, tenantEmployees.length));
    for (let i = 0; i < feedbackPairs.length; i++) {
      const sender = feedbackPairs[i];
      const receiver = tenantEmployees[(i + 3) % tenantEmployees.length];
      if (sender.id === receiver.id) continue;

      await prisma.feedback.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          senderId: sender.id,
          receiverId: receiver.id,
          content:
            'Kolaborasi yang sangat baik dalam proyek integrasi sistem. Responsif dan detail-oriented.',
          type: FeedbackType.POSITIVE,
          visibility: FeedbackVisibility.VISIBLE_TO_MANAGER,
        },
      });
    }
  }

  console.log('✅ Performance reviews, goals & feedback seeded.');
}
