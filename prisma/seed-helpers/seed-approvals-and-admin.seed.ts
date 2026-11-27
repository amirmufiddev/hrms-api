import {
  AuditAction,
  CompOffStatus,
  Employee,
  EmployeeStatus,
  EmploymentType,
  ExpenseClaimStatus,
  LeaveRequestStatus,
  NotificationType,
  OnboardingProcessStatus,
  OnboardingTaskCategory,
  OnboardingTaskStatus,
  OnboardingType,
  PerformanceReviewStatus,
  PrismaClient,
  RegularizationStatus,
  ReviewCycleStatus,
  SeparationStatus,
  SeparationType,
  Tenant,
} from "@prisma/client";
import { addDays, uuid } from "./utils";

/**
 * Seed data khusus agar halaman approval, admin, dan modul terkait tampil di UI.
 * Fokus: status PENDING/SUBMITTED, OT belum di-approve, ot-rules, audit, expiry docs.
 */
export async function seedApprovalsAndAdmin(
  prisma: PrismaClient,
  tenants: Tenant[],
  employees: Employee[],
): Promise<void> {
  console.log(
    "\n🔔 Seeding pending approvals, admin data & page-specific records...",
  );

  const now = new Date("2026-09-06T12:00:00.000Z");
  const twoWeeksAgo = addDays(now, -14);

  for (const tenant of tenants) {
    const activeEmployees = employees.filter(
      (e) => e.tenantId === tenant.id && e.status === EmployeeStatus.ACTIVE,
    );
    if (activeEmployees.length === 0) continue;

    const leaveTypes = await prisma.leaveType.findMany({
      where: { tenantId: tenant.id },
    });
    const ctType = leaveTypes.find((lt) => lt.code === "CT");
    const expenseCats = await prisma.expenseCategory.findMany({
      where: { tenantId: tenant.id },
    });

    // ── OT Rules (admin/ot-rules) ─────────────────────────────────────────
    for (const empType of [
      EmploymentType.PERMANENT,
      EmploymentType.CONTRACT,
      null,
    ]) {
      const existing = await prisma.otRule.findFirst({
        where: {
          tenantId: tenant.id,
          employmentType: empType ?? undefined,
        },
      });
      if (!existing) {
        await prisma.otRule.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            name: empType ? `OT Rule ${empType}` : "OT Rule Default",
            employmentType: empType ?? undefined,
            dailyThresholdMinutes: 480,
            weeklyThresholdMinutes: 2400,
            roundingIntervalMinutes: 15,
            requiresManagerApproval: true,
            maxOtPerDayMinutes: 180,
            maxOtPerMonthMinutes: 3600,
            isActive: true,
          },
        });
      }
    }

    // ── Pending OT approvals (approvals/ot) — update recent records ───────
    const directReportIds = activeEmployees
      .filter((e) => e.managerId)
      .map((e) => e.id);

    const recentOtCandidates = await prisma.attendanceRecord.findMany({
      where: {
        tenantId: tenant.id,
        employeeId: { in: directReportIds },
        date: { gte: twoWeeksAgo, lte: now },
        otMinutesCalculated: { gt: 0 },
      },
      take: 25,
      orderBy: { date: "desc" },
    });

    for (const rec of recentOtCandidates.slice(0, 15)) {
      await prisma.attendanceRecord.update({
        where: { id: rec.id },
        data: { otMinutesApproved: null },
      });
    }

    // ── Pending Leave (approvals/leave) ───────────────────────────────────
    if (ctType) {
      const leaveTargets = activeEmployees
        .filter((e) => e.managerId)
        .slice(0, 20);
      for (let i = 0; i < leaveTargets.length; i++) {
        const emp = leaveTargets[i];
        const start = addDays(now, 7 + i);
        const end = addDays(start, i % 3);

        await prisma.leaveRequest.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            employeeId: emp.id,
            leaveTypeId: ctType.id,
            startDate: start,
            endDate: end,
            totalDays: Math.max(1, end.getUTCDate() - start.getUTCDate() + 1),
            reason: "Cuti tahunan - rencana liburan akhir pekan panjang",
            status: LeaveRequestStatus.PENDING,
            approverId: emp.managerId,
            createdAt: addDays(now, -2),
          },
        });
      }
    }

    // ── Submitted Expenses (approvals/expenses) ───────────────────────────
    const expCat = expenseCats[0];
    if (expCat) {
      const expTargets = activeEmployees
        .filter((e) => e.managerId)
        .slice(0, 15);
      for (let i = 0; i < expTargets.length; i++) {
        const emp = expTargets[i];
        await prisma.expenseClaim.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            employeeId: emp.id,
            categoryId: expCat.id,
            amount: 150_000 + i * 25_000,
            description: "Transportasi rapat koordinasi proyek Q3 2026",
            expenseDate: addDays(now, -5 - i),
            status: ExpenseClaimStatus.SUBMITTED,
            approverId: emp.managerId,
            createdAt: addDays(now, -3),
          },
        });
      }
    }

    // ── Pending Comp-Off (approvals/comp-off + leave/comp-off for employees) ─
    const compTargets = activeEmployees.filter((e) => e.managerId);
    for (let i = 0; i < compTargets.length; i++) {
      const emp = compTargets[i];
      const workedDate = addDays(now, -10 - (i % 5));

      // Pending — untuk halaman approval manager
      if (i % 3 === 0) {
        await prisma.compOffRequest.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            employeeId: emp.id,
            workedDate,
            reason: "Lembur deployment hotfix production",
            earnedDays: 1,
            status: CompOffStatus.PENDING,
            expiryDate: addDays(now, 60),
            createdAt: addDays(now, -2),
          },
        });
      }

      // Approved — untuk halaman comp-off /me user
      if (i % 2 === 0) {
        await prisma.compOffRequest.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            employeeId: emp.id,
            workedDate: addDays(workedDate, -30),
            reason: "Lembur audit sistem keamanan",
            earnedDays: 1,
            status: CompOffStatus.APPROVED,
            approverId: emp.managerId,
            approvedAt: addDays(workedDate, -28),
            expiryDate: addDays(now, 30),
          },
        });
      }
    }

    // ── Pending Regularization (approvals/regularization) ─────────────────
    const regTargets = activeEmployees.filter((e) => e.managerId).slice(0, 12);
    for (let i = 0; i < regTargets.length; i++) {
      const emp = regTargets[i];
      const regDate = addDays(now, -3 - i);
      const reqIn = new Date(regDate);
      reqIn.setUTCHours(8, 0, 0, 0);
      const reqOut = new Date(regDate);
      reqOut.setUTCHours(17, 30, 0, 0);

      await prisma.attendanceRegularization.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          employeeId: emp.id,
          date: regDate,
          requestedClockIn: reqIn,
          requestedClockOut: reqOut,
          reason: "Lupa clock-out karena meeting berlarut",
          status: RegularizationStatus.PENDING,
          approverId: emp.managerId,
          createdAt: addDays(regDate, 1),
        },
      });
    }

    // ── Document expiry (admin/document-expiry) ───────────────────────────
    const docs = await prisma.employeeDocument.findMany({
      where: { tenantId: tenant.id },
      take: 30,
    });
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const expiryDate =
        i % 3 === 0
          ? addDays(now, 15 + i) // expiring soon
          : i % 3 === 1
            ? addDays(now, -10 - i) // already expired
            : addDays(now, 180 + i); // future
      await prisma.employeeDocument.update({
        where: { id: doc.id },
        data: { expiryDate },
      });
    }

    // Tambah dokumen dengan expiry jika belum ada
    if (docs.length === 0 && activeEmployees.length > 0) {
      for (const emp of activeEmployees.slice(0, 10)) {
        const uploadKey = `seed/docs/${tenant.id}/${emp.id}/sim-expiry.pdf`;
        const upload = await prisma.upload.upsert({
          where: { key: uploadKey },
          update: {},
          create: {
            id: uuid(),
            tenantId: tenant.id,
            key: uploadKey,
            fileName: "SIM.pdf",
            mimeType: "application/pdf",
            size: 51200,
            uploadedBy: emp.id,
          },
        });
        await prisma.employeeDocument.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            employeeId: emp.id,
            uploadId: upload.id,
            name: "Surat Izin Mengemudi",
            category: "ID_PROOF",
            expiryDate: addDays(now, 20),
            isVerified: true,
          },
        });
      }
    }

    // ── Audit logs (admin/audit) ──────────────────────────────────────────
    const auditEntries = [
      {
        action: AuditAction.CREATE,
        entityType: "Employee",
        entityId: activeEmployees[0]?.id,
      },
      {
        action: AuditAction.UPDATE,
        entityType: "LeaveRequest",
        entityId: null,
      },
      { action: AuditAction.CREATE, entityType: "PayrollRun", entityId: null },
      {
        action: AuditAction.UPDATE,
        entityType: "ExpenseClaim",
        entityId: null,
      },
      { action: AuditAction.LOGIN, entityType: "User", entityId: null },
      {
        action: AuditAction.CREATE,
        entityType: "AttendanceRecord",
        entityId: null,
      },
      {
        action: AuditAction.UPDATE,
        entityType: "EmployeeSalary",
        entityId: null,
      },
      {
        action: AuditAction.CREATE,
        entityType: "PerformanceReview",
        entityId: null,
      },
    ];

    for (let i = 0; i < 20; i++) {
      const entry = auditEntries[i % auditEntries.length];
      await prisma.auditLog.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          userId: null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? uuid(),
          newValues: { seeded: true, index: i },
          ipAddress: "127.0.0.1",
          createdAt: addDays(now, -30 + i),
        },
      });
    }

    // ── Onboarding IN_PROGRESS (onboarding page) ────────────────────────
    let template = await prisma.onboardingTemplate.findFirst({
      where: { tenantId: tenant.id, name: "Onboarding Karyawan Baru" },
    });
    if (!template) {
      template = await prisma.onboardingTemplate.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          name: "Onboarding Karyawan Baru",
          type: OnboardingType.ONBOARDING,
          tasks: [],
          isActive: true,
        },
      });
    }

    const onboardTargets = activeEmployees.slice(
      0,
      Math.min(8, activeEmployees.length),
    );
    for (let i = 0; i < onboardTargets.length; i++) {
      const emp = onboardTargets[i];
      const existing = await prisma.onboardingProcess.findFirst({
        where: { tenantId: tenant.id, employeeId: emp.id },
      });
      if (existing) continue;

      const process = await prisma.onboardingProcess.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          employeeId: emp.id,
          templateId: template.id,
          type: OnboardingType.ONBOARDING,
          status:
            i % 3 === 0
              ? OnboardingProcessStatus.IN_PROGRESS
              : i % 3 === 1
                ? OnboardingProcessStatus.NOT_STARTED
                : OnboardingProcessStatus.COMPLETED,
          startDate: addDays(now, -14 + i),
          targetDate: addDays(now, 14),
          completedAt: i % 3 === 2 ? addDays(now, -1) : undefined,
        },
      });

      const tasks = [
        {
          title: "Setup akun SSO & email",
          category: OnboardingTaskCategory.IT_SETUP,
        },
        {
          title: "Tanda tangan kontrak kerja",
          category: OnboardingTaskCategory.HR_PAPERWORK,
        },
        {
          title: "Orientasi kebijakan perusahaan",
          category: OnboardingTaskCategory.TRAINING,
        },
      ];
      for (let t = 0; t < tasks.length; t++) {
        await prisma.onboardingTask.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            processId: process.id,
            title: tasks[t].title,
            category: tasks[t].category,
            assigneeId: emp.managerId,
            status:
              process.status === OnboardingProcessStatus.COMPLETED
                ? OnboardingTaskStatus.COMPLETED
                : t === 0
                  ? OnboardingTaskStatus.COMPLETED
                  : OnboardingTaskStatus.PENDING,
            sortOrder: t,
            dueDate: addDays(now, 7 + t),
          },
        });
      }
    }

    // ── Separation (exit-management) ──────────────────────────────────────
    const exitCandidates = activeEmployees.slice(-2);
    for (let si = 0; si < exitCandidates.length; si++) {
      const emp = exitCandidates[si];
      const existing = await prisma.separation.findFirst({
        where: { tenantId: tenant.id, employeeId: emp.id },
      });
      if (existing) continue;

      await prisma.separation.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          employeeId: emp.id,
          type: SeparationType.RESIGNATION,
          status:
            si % 2 === 0
              ? SeparationStatus.NOTICE_PERIOD
              : SeparationStatus.INITIATED,
          reason: "Mengundurkan diri - relokasi ke kota lain",
          lastWorkingDate: addDays(now, 30),
          noticePeriodDays: 30,
          initiatedDate: addDays(now, -5),
        },
      });
    }

    // ── Performance team — mix SELF_REVIEW & MANAGER_REVIEW untuk siklus aktif ─
    const activeCycle = await prisma.reviewCycle.findFirst({
      where: { tenantId: tenant.id, status: ReviewCycleStatus.ACTIVE },
    });
    if (activeCycle) {
      const reviews = await prisma.performanceReview.findMany({
        where: { cycleId: activeCycle.id, tenantId: tenant.id },
        take: 20,
      });
      for (let ri = 0; ri < reviews.length; ri++) {
        const rev = reviews[ri];
        const isManagerReview = ri % 2 === 0;
        await prisma.performanceReview.update({
          where: { id: rev.id },
          data: isManagerReview
            ? {
                status: PerformanceReviewStatus.MANAGER_REVIEW,
                selfRating: rev.selfRating ?? 4,
                selfComments:
                  "Target kuartal sudah 70% tercapai, siap untuk review manager.",
                selfSubmittedAt: addDays(now, -3),
                managerRating: null,
                managerComments: null,
                overallRating: null,
              }
            : {
                status: PerformanceReviewStatus.SELF_REVIEW,
                selfRating: rev.selfRating ?? 4,
                selfComments:
                  "Masih mengisi self-assessment untuk periode ini.",
                selfSubmittedAt: addDays(now, -1),
                managerRating: null,
                managerComments: null,
                overallRating: null,
              },
        });
      }
    }

    // ── Comp-off untuk akun HR demo (leave/comp-off /me) ───────────────────
    const hrDemoEmails = [
      "amir.mufid@eigernature.com",
      "bagas.prakarso@eigernature.com",
    ];
    for (const email of hrDemoEmails) {
      const hrUser = await prisma.user.findFirst({
        where: { tenantId: tenant.id, email },
        select: { employeeId: true },
      });
      if (!hrUser?.employeeId) continue;

      const existingMine = await prisma.compOffRequest.count({
        where: { tenantId: tenant.id, employeeId: hrUser.employeeId },
      });
      if (existingMine >= 2) continue;

      await prisma.compOffRequest.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          employeeId: hrUser.employeeId,
          workedDate: addDays(now, -7),
          reason: "Support operasional event akhir pekan",
          earnedDays: 1,
          status: CompOffStatus.APPROVED,
          expiryDate: addDays(now, 90),
          createdAt: addDays(now, -5),
        },
      });
      await prisma.compOffRequest.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          employeeId: hrUser.employeeId,
          workedDate: addDays(now, -3),
          reason: "Deployment release hotfix",
          earnedDays: 0.5,
          status: CompOffStatus.PENDING,
          expiryDate: addDays(now, 60),
          createdAt: addDays(now, -1),
        },
      });
    }

    // ── Notifications sample ──────────────────────────────────────────────
    const users = await prisma.user.findMany({
      where: { tenantId: tenant.id, isActive: true },
      take: 10,
    });
    for (const user of users) {
      await prisma.notification.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          userId: user.id,
          type: NotificationType.GENERAL,
          title: "Pengajuan Cuti Menunggu Persetujuan",
          message: "Ada pengajuan cuti dari tim Anda yang perlu ditinjau.",
          link: "/approvals/leave",
          isRead: false,
        },
      });
    }
  }

  console.log("✅ Pending approvals, admin & page-specific records seeded.");
}
