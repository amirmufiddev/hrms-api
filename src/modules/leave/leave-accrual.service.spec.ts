import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AccrualStatus, AccrualTriggerType } from '@prisma/client';
import { LeaveAccrualService } from './leave-accrual.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { createMockPrismaService, createMockNotificationsService } from '../../test/helpers';

describe('LeaveAccrualService', () => {
  let service: LeaveAccrualService;
  let prisma: any;
  let notifications: ReturnType<typeof createMockNotificationsService>;
  let audit: { log: jest.Mock };

  const tenantId = 'tenant-1';
  const rule = {
    id: 'rule-1',
    tenantId,
    leaveTypeId: 'lt-1',
    monthlyAccrualDays: 1.5,
    maxBalanceCap: 30,
    applyCapOnAccrual: true,
    isActive: true,
    leaveType: { id: 'lt-1', name: 'Annual Leave', isActive: true },
  };

  beforeEach(async () => {
    notifications = createMockNotificationsService();
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveAccrualService,
        { provide: PrismaService, useValue: createMockPrismaService() },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(LeaveAccrualService);
    prisma = module.get(PrismaService);
  });

  describe('createAccrualRule', () => {
    it('membuat aturan bila tipe cuti aktif dan belum punya aturan', async () => {
      prisma.leaveAccrualRule.findUnique.mockResolvedValue(null);
      prisma.leaveType.findFirst.mockResolvedValue(rule.leaveType);
      prisma.leaveAccrualRule.create.mockResolvedValue(rule);

      const result = await service.createAccrualRule(tenantId, {
        leaveTypeId: 'lt-1',
        monthlyAccrualDays: 1.5,
        maxBalanceCap: 30,
      });

      expect(result).toEqual(rule);
      expect(prisma.leaveAccrualRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          leaveTypeId: 'lt-1',
          monthlyAccrualDays: 1.5,
          applyCapOnAccrual: true,
        }),
        include: { leaveType: true },
      });
    });

    it('menolak aturan duplikat untuk tipe cuti yang sama', async () => {
      prisma.leaveAccrualRule.findUnique.mockResolvedValue(rule);

      await expect(
        service.createAccrualRule(tenantId, { leaveTypeId: 'lt-1', monthlyAccrualDays: 1 }),
      ).rejects.toThrow(ConflictException);
    });

    it('menolak bila tipe cuti tidak ditemukan', async () => {
      prisma.leaveAccrualRule.findUnique.mockResolvedValue(null);
      prisma.leaveType.findFirst.mockResolvedValue(null);

      await expect(
        service.createAccrualRule(tenantId, { leaveTypeId: 'missing', monthlyAccrualDays: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAccrualRule', () => {
    it('menonaktifkan aturan, bukan hard-delete', async () => {
      prisma.leaveAccrualRule.findFirst.mockResolvedValue(rule);
      prisma.leaveAccrualRule.update.mockResolvedValue({ ...rule, isActive: false });

      await service.deleteAccrualRule(tenantId, 'rule-1');

      expect(prisma.leaveAccrualRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: { isActive: false },
      });
      expect(prisma.leaveAccrualRule.delete).not.toHaveBeenCalled();
    });
  });

  describe('triggerAccrual', () => {
    beforeEach(() => {
      prisma.leaveAccrualRun.findUnique.mockResolvedValue(null);
      prisma.leaveAccrualRun.create.mockResolvedValue({ id: 'run-1' });
      prisma.employee.findMany.mockResolvedValue([
        { id: 'emp-1', firstName: 'John', lastName: 'Doe' },
      ]);
      prisma.leaveAccrualRule.findMany.mockResolvedValue([rule]);
      prisma.leaveBalance.findFirst.mockResolvedValue({
        id: 'bal-1',
        totalDays: 10,
      });
      prisma.leaveBalance.update.mockResolvedValue({
        id: 'bal-1',
        totalDays: 11.5,
      });
      prisma.leaveAccrualEntry.create.mockResolvedValue({ id: 'entry-1' });
      prisma.leaveAccrualRun.update.mockResolvedValue({});
    });

    it('menambah saldo cuti dan menandai run selesai', async () => {
      const result = await service.triggerAccrual(
        tenantId,
        { month: 10, year: 2026 },
        AccrualTriggerType.MANUAL_ADMIN,
        'user-1',
      );

      expect(result).toEqual({
        accrualRunId: 'run-1',
        status: AccrualStatus.COMPLETED,
        processedCount: 1,
        failedCount: 0,
        message: 'Accrual completed for 2026-10',
      });
      expect(prisma.leaveBalance.update).toHaveBeenCalledWith({
        where: { id: 'bal-1' },
        data: { totalDays: { increment: expect.anything() } },
      });
      expect(prisma.leaveAccrualRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          status: AccrualStatus.COMPLETED,
          processedCount: 1,
          failedCount: 0,
        }),
      });
      expect(notifications.notifyEmployee).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });

    it('menolak run yang sudah COMPLETED untuk bulan yang sama', async () => {
      prisma.leaveAccrualRun.findUnique.mockResolvedValue({
        id: 'run-old',
        status: AccrualStatus.COMPLETED,
      });

      await expect(
        service.triggerAccrual(tenantId, { month: 10, year: 2026 }, AccrualTriggerType.CRON_JOB),
      ).rejects.toThrow(ConflictException);
      expect(prisma.leaveAccrualRun.create).not.toHaveBeenCalled();
    });

    it('menolak bulan di luar 1-12', async () => {
      await expect(
        service.triggerAccrual(tenantId, { month: 13, year: 2026 }, AccrualTriggerType.CRON_JOB),
      ).rejects.toThrow(BadRequestException);
    });

    it('memotong accrual bila saldo akan melewati cap', async () => {
      prisma.leaveBalance.findFirst.mockResolvedValue({ id: 'bal-1', totalDays: 29 });
      prisma.leaveBalance.update.mockResolvedValue({ id: 'bal-1', totalDays: 30 });

      await service.triggerAccrual(
        tenantId,
        { month: 4, year: 2026 },
        AccrualTriggerType.CRON_JOB,
      );

      expect(prisma.leaveAccrualEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          capApplied: true,
          employeeId: 'emp-1',
          leaveTypeId: 'lt-1',
        }),
      });
    });

    it('menandai run FAILED bila tidak ada aturan aktif', async () => {
      prisma.leaveAccrualRule.findMany.mockResolvedValue([]);

      await expect(
        service.triggerAccrual(tenantId, { month: 10, year: 2026 }, AccrualTriggerType.CRON_JOB),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.leaveAccrualRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({ status: AccrualStatus.FAILED }),
      });
    });
  });
});
