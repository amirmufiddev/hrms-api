import {
  AnnouncementPriority,
  DocumentCategory,
  Employee,
  EmployeeStatus,
  LetterType,
  NotificationType,
  OnboardingProcessStatus,
  OnboardingTaskCategory,
  OnboardingTaskStatus,
  OnboardingType,
  PrismaClient,
  SeparationStatus,
  SeparationType,
  Tenant,
  User,
} from '@prisma/client';
import { addDays, uuid } from './utils';

export async function seedOnboardingAndCorporate(
  prisma: PrismaClient,
  tenants: Tenant[],
  employees: Employee[],
  users: User[],
): Promise<void> {
  console.log('\n📋 Seeding onboarding, documents, announcements & notifications...');

  for (const tenant of tenants) {
    const template = await prisma.onboardingTemplate.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: 'Onboarding Karyawan Baru' } },
      update: {},
      create: {
        id: uuid(),
        tenantId: tenant.id,
        name: 'Onboarding Karyawan Baru',
        type: OnboardingType.ONBOARDING,
        description: 'Checklist orientasi karyawan baru',
        tasks: [
          { title: 'Setup email & akun SSO', category: 'IT_SETUP' },
          { title: 'Tanda tangan kontrak kerja', category: 'HR_PAPERWORK' },
          { title: 'Orientasi kebijakan perusahaan', category: 'TRAINING' },
          { title: 'Penyerahan kartu akses', category: 'FACILITIES' },
        ],
        isActive: true,
      },
    });

    let letterTemplate = await prisma.letterTemplate.findFirst({
      where: { tenantId: tenant.id, name: 'Surat Pengangkatan Karyawan' },
    });
    if (!letterTemplate) {
      letterTemplate = await prisma.letterTemplate.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          name: 'Surat Pengangkatan Karyawan',
          type: LetterType.APPOINTMENT_LETTER,
          content:
            'Dengan ini kami mengangkat {{employee.name}} sebagai karyawan tetap di {{company.name}}.',
          isActive: true,
        },
      });
    }

    const tenantEmployees = employees.filter((e) => e.tenantId === tenant.id);
    const activeEmployees = tenantEmployees.filter((e) => e.status === EmployeeStatus.ACTIVE);
    const hrAdmin = users.find(
      (u) => u.tenantId === tenant.id && u.role !== 'EMPLOYEE',
    );

    // Onboarding for employees joined after 2025-01-01
    const newHires = tenantEmployees.filter(
      (e) => e.joinDate >= new Date('2025-01-01T00:00:00.000Z'),
    ).slice(0, 10);

    for (const emp of newHires) {
      const idx = newHires.indexOf(emp);
      const status =
        idx % 3 === 0
          ? OnboardingProcessStatus.IN_PROGRESS
          : idx % 3 === 1
            ? OnboardingProcessStatus.COMPLETED
            : OnboardingProcessStatus.NOT_STARTED;

      const process = await prisma.onboardingProcess.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          employeeId: emp.id,
          templateId: template.id,
          type: OnboardingType.ONBOARDING,
          status,
          startDate: emp.joinDate,
          targetDate: addDays(emp.joinDate, 14),
          completedAt:
            status === OnboardingProcessStatus.COMPLETED
              ? addDays(emp.joinDate, 12)
              : undefined,
        },
      });

      const taskDefs = [
        { title: 'Setup email & akun SSO', category: OnboardingTaskCategory.IT_SETUP },
        { title: 'Tanda tangan kontrak kerja', category: OnboardingTaskCategory.HR_PAPERWORK },
        { title: 'Orientasi kebijakan perusahaan', category: OnboardingTaskCategory.TRAINING },
        { title: 'Penyerahan kartu akses', category: OnboardingTaskCategory.FACILITIES },
      ];

      for (let i = 0; i < taskDefs.length; i++) {
        await prisma.onboardingTask.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            processId: process.id,
            title: taskDefs[i].title,
            category: taskDefs[i].category,
            assigneeId: hrAdmin?.employeeId ?? emp.managerId,
            status:
              status === OnboardingProcessStatus.COMPLETED
                ? OnboardingTaskStatus.COMPLETED
                : i === 0 && status === OnboardingProcessStatus.IN_PROGRESS
                  ? OnboardingTaskStatus.COMPLETED
                  : OnboardingTaskStatus.PENDING,
            dueDate: addDays(emp.joinDate, 3 + i * 2),
            completedAt:
              status === OnboardingProcessStatus.COMPLETED
                ? addDays(emp.joinDate, 2 + i * 2)
                : i === 0 && status === OnboardingProcessStatus.IN_PROGRESS
                  ? addDays(emp.joinDate, 2)
                  : undefined,
            sortOrder: i,
          },
        });
      }
    }

    // Documents & letters for sample employees
    for (const emp of activeEmployees.slice(0, 15)) {
      const uploadKey = `seed/docs/${tenant.id}/${emp.id}/ktp.pdf`;

      const upload = await prisma.upload.upsert({
        where: { key: uploadKey },
        update: {
          tenantId: tenant.id,
          fileName: 'KTP.pdf',
          mimeType: 'application/pdf',
          size: 102400,
          uploadedBy: emp.id,
          entityType: 'employee',
          entityId: emp.id,
        },
        create: {
          id: uuid(),
          tenantId: tenant.id,
          key: uploadKey,
          fileName: 'KTP.pdf',
          mimeType: 'application/pdf',
          size: 102400,
          uploadedBy: emp.id,
          entityType: 'employee',
          entityId: emp.id,
        },
      });

      const existingDoc = await prisma.employeeDocument.findFirst({
        where: { tenantId: tenant.id, employeeId: emp.id, uploadId: upload.id },
      });

      if (!existingDoc) {
        await prisma.employeeDocument.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            employeeId: emp.id,
            uploadId: upload.id,
            name: 'Kartu Tanda Penduduk',
            category: DocumentCategory.ID_PROOF,
            documentDate: emp.joinDate,
            isVerified: true,
            verifiedAt: addDays(emp.joinDate, 5),
          },
        });
      }

      const existingLetter = await prisma.letterGenerated.findFirst({
        where: { tenantId: tenant.id, employeeId: emp.id, templateId: letterTemplate.id },
      });

      if (!existingLetter) {
        await prisma.letterGenerated.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            templateId: letterTemplate.id,
            employeeId: emp.id,
            content: `Surat pengangkatan untuk ${emp.firstName} ${emp.lastName} sebagai karyawan tetap.`,
            generatedBy: hrAdmin?.employeeId ?? emp.id,
          },
        });
      }
    }

    // Announcements
    const announcements = [
      {
        title: 'Libur Bersama Idul Fitri 2025',
        content: 'Seluruh karyawan libur bersama tanggal 1-2 April 2025. Selamat Hari Raya!',
        priority: AnnouncementPriority.HIGH,
        publishedAt: new Date('2025-03-20T08:00:00.000Z'),
      },
      {
        title: 'Town Hall Q1 2026',
        content: 'Town Hall kuartal pertama akan diadakan pada 15 Maret 2026 pukul 10:00 WIB.',
        priority: AnnouncementPriority.NORMAL,
        publishedAt: new Date('2026-03-01T08:00:00.000Z'),
      },
      {
        title: 'Kebijakan Hybrid Work Update',
        content: 'Kebijakan WFH diperbarui: maksimal 2 hari per minggu dengan persetujuan atasan.',
        priority: AnnouncementPriority.URGENT,
        publishedAt: new Date('2026-06-01T08:00:00.000Z'),
      },
    ];

    const author = activeEmployees[0];
    if (author) {
      for (const ann of announcements) {
        await prisma.announcement.create({
          data: {
            id: uuid(),
            tenantId: tenant.id,
            title: ann.title,
            content: ann.content,
            priority: ann.priority,
            isPublished: true,
            publishedAt: ann.publishedAt,
            authorId: author.id,
          },
        });
      }
    }

    // Notifications for users
    for (const user of users.filter((u) => u.tenantId === tenant.id).slice(0, 20)) {
      await prisma.notification.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          userId: user.id,
          type: NotificationType.GENERAL,
          title: 'Slip Gaji Agustus 2026 Tersedia',
          message: 'Slip gaji bulan Agustus 2026 sudah dapat diunduh di menu My Payslips.',
          link: '/my-payslips',
          isRead: false,
        },
      });
    }

    // One separation record (historical)
    const exitCandidate = tenantEmployees.find(
      (e) => e.status === EmployeeStatus.INACTIVE,
    );
    if (exitCandidate) {
      await prisma.separation.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          employeeId: exitCandidate.id,
          type: SeparationType.RESIGNATION,
          status: SeparationStatus.COMPLETED,
          reason: 'Mengundurkan diri untuk peluang karier di perusahaan lain',
          lastWorkingDate: new Date('2025-11-30T00:00:00.000Z'),
          noticePeriodDays: 30,
          exitInterviewDone: true,
          exitInterviewNotes: 'Exit interview selesai, handover dokumentasi lengkap.',
          processedBy: hrAdmin?.employeeId,
          completedAt: new Date('2025-12-15T00:00:00.000Z'),
        },
      });
    }
  }

  console.log('✅ Onboarding, documents, announcements & notifications seeded.');
}
