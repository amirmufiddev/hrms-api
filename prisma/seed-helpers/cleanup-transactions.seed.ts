import { PrismaClient } from '@prisma/client';

/** Hapus data transaksi lama agar seed idempotent (master SSO tetap) */
export async function cleanupTransactionData(prisma: PrismaClient): Promise<void> {
  console.log('🧹 Cleaning existing transaction data for re-seed...');

  await prisma.leaveAccrualEntry.deleteMany({});
  await prisma.leaveAccrualRun.deleteMany({});
  await prisma.attendanceSession.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.attendanceRegularization.deleteMany({});
  await prisma.compOffRequest.deleteMany({});
  await prisma.payslip.deleteMany({});
  await prisma.payrollRun.deleteMany({});
  await prisma.employeeSalary.deleteMany({});
  await prisma.salaryStructure.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.leaveBalance.deleteMany({});
  await prisma.leaveAccrualRule.deleteMany({});
  await prisma.expenseClaim.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.performanceReview.deleteMany({});
  await prisma.reviewCycle.deleteMany({});
  await prisma.feedback.deleteMany({});
  await prisma.improvementPlanGoal.deleteMany({});
  await prisma.improvementPlan.deleteMany({});
  await prisma.onboardingTask.deleteMany({});
  await prisma.onboardingProcess.deleteMany({});
  await prisma.onboardingTemplate.deleteMany({});
  await prisma.letterGenerated.deleteMany({});
  await prisma.letterTemplate.deleteMany({});
  await prisma.employeeDocument.deleteMany({});
  await prisma.upload.deleteMany({ where: { key: { startsWith: 'seed/' } } });
  await prisma.separation.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.shiftAssignment.deleteMany({});
  await prisma.holiday.deleteMany({});
  await prisma.auditLog.deleteMany({});

  console.log('✅ Transaction data cleaned.');
}
