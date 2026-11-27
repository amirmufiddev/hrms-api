import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PayrollCalculationService } from './payroll-calculation.service';
import {
  CreatePayrollRunDto,
  CreateDailyPayrollRunDto,
  PayrollRunQueryDto,
  PayslipQueryDto,
} from './dto/payroll.dto';
import { PayrollRunKind, PayrollRunStatus, UserRole } from '@prisma/client';
import {
  countUnpaidDailyAttendanceDays,
  SettledDailyPeriod,
} from './daily-payroll.helpers';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private calculationService: PayrollCalculationService,
  ) {}

  // ============================================
  // Payroll Runs
  // ============================================

  async getRuns(tenantId: string, query: PayrollRunQueryDto) {
    const where: any = { tenantId };
    if (query.year) where.year = parseInt(query.year);
    if (query.status) where.status = query.status;

    return this.prisma.payrollRun.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        _count: { select: { payslips: true } },
      },
    });
  }

  async getRun(tenantId: string, id: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, tenantId },
      include: {
        selectedEmployees: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                department: { select: { name: true } },
                employeeSalaries: {
                  where: { isActive: true, payBasis: 'DAILY' },
                  select: { basePay: true },
                  take: 1,
                },
              },
            },
          },
        },
        payslips: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                designation: true,
                department: { select: { name: true } },
              },
            },
          },
          orderBy: { employee: { firstName: 'asc' } },
        },
      },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  async createRun(tenantId: string, dto: CreatePayrollRunDto) {
    // Check for duplicate
    const existing = await this.prisma.payrollRun.findFirst({
      where: {
        tenantId,
        kind: 'MONTHLY',
        month: dto.month,
        year: dto.year,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Payroll run for ${dto.month}/${dto.year} already exists`,
      );
    }

    return this.prisma.payrollRun.create({
      data: {
        tenantId,
        kind: PayrollRunKind.MONTHLY,
        month: dto.month,
        year: dto.year,
        remarks: dto.remarks,
      },
    });
  }

  async createDailyRun(tenantId: string, dto: CreateDailyPayrollRunDto) {
    if (!dto.employeeIds?.length) {
      throw new BadRequestException('At least one employee must be selected');
    }

    const start = new Date(dto.periodStart);
    const end = new Date(dto.periodEnd);
    if (end < start) {
      throw new BadRequestException('Period end must be on or after period start');
    }

    const salaries = await this.prisma.employeeSalary.findMany({
      where: {
        tenantId,
        employeeId: { in: dto.employeeIds },
        isActive: true,
        payBasis: 'DAILY',
      },
      select: { employeeId: true },
    });
    const eligible = new Set(salaries.map((s) => s.employeeId));
    const missing = dto.employeeIds.filter((id) => !eligible.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        'All selected employees must have an active daily rate',
      );
    }

    return this.prisma.payrollRun.create({
      data: {
        tenantId,
        kind: PayrollRunKind.DAILY,
        periodStart: start,
        periodEnd: end,
        selectedEmployees: {
          create: dto.employeeIds.map((employeeId) => ({ employeeId })),
        },
      },
      include: {
        selectedEmployees: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                department: { select: { name: true } },
                employeeSalaries: {
                  where: { isActive: true, payBasis: 'DAILY' },
                  select: { basePay: true },
                  take: 1,
                },
              },
            },
          },
        },
        _count: { select: { payslips: true } },
      },
    });
  }

  async processRun(tenantId: string, id: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, tenantId },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollRunStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot process run in ${run.status} status. Only DRAFT runs can be processed.`,
      );
    }

    if (run.kind === PayrollRunKind.DAILY) {
      return this.processDailyRun(tenantId, id);
    }

    // Mark as processing
    await this.prisma.payrollRun.update({
      where: { id },
      data: { status: PayrollRunStatus.PROCESSING },
    });

    try {
      // Get all active employees with salary assignments
      const employees = await this.prisma.employee.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          employeeSalaries: {
            some: { isActive: true, payBasis: 'MONTH' },
          },
        },
        select: { id: true },
      });

      // Delete any previous payslips for this run
      await this.prisma.payslip.deleteMany({
        where: { payrollRunId: id },
      });

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      let processedCount = 0;

      for (const emp of employees) {
        const result = await this.calculationService.calculateForEmployee(
          tenantId,
          emp.id,
          run.month!,
          run.year!,
        );

        if (!result) continue; // No salary assigned, skip

        await this.prisma.payslip.create({
          data: {
            tenantId,
            payrollRunId: id,
            employeeId: result.employeeId,
            workingDays: result.workingDays,
            presentDays: result.presentDays,
            leaveDays: result.leaveDays,
            lopDays: result.lopDays,
            otHours: result.otHours,
            basePay: result.basePay,
            earnings: result.earnings as any,
            deductions: result.deductions as any,
            grossPay: result.grossPay,
            totalDeductions: result.totalDeductions,
            netPay: result.netPay,
            otPay: result.otPay,
          },
        });

        totalGross += result.grossPay;
        totalDeductions += result.totalDeductions;
        totalNet += result.netPay;
        processedCount++;
      }

      // Update run with totals
      return this.prisma.payrollRun.update({
        where: { id },
        data: {
          status: PayrollRunStatus.COMPUTED,
          totalGross: Math.round(totalGross * 100) / 100,
          totalDeductions: Math.round(totalDeductions * 100) / 100,
          totalNet: Math.round(totalNet * 100) / 100,
          processedCount,
          processedAt: new Date(),
        },
        include: {
          _count: { select: { payslips: true } },
        },
      });
    } catch (error) {
      // Revert to DRAFT on failure
      await this.prisma.payrollRun.update({
        where: { id },
        data: { status: PayrollRunStatus.DRAFT },
      });
      throw error;
    }
  }

  async approveRun(tenantId: string, id: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, tenantId },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollRunStatus.COMPUTED) {
      throw new BadRequestException(
        `Cannot approve run in ${run.status} status. Only COMPUTED runs can be approved.`,
      );
    }

    return this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: PayrollRunStatus.APPROVED,
        approvedAt: new Date(),
      },
    });
  }

  async markAsPaid(tenantId: string, id: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, tenantId },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollRunStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot mark as paid. Only APPROVED runs can be marked as paid.`,
      );
    }

    return this.prisma.payrollRun.update({
      where: { id },
      data: { status: PayrollRunStatus.PAID },
    });
  }

  async deleteRun(tenantId: string, id: string, userRole?: UserRole) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, tenantId },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (userRole !== UserRole.SUPER_ADMIN && run.status !== PayrollRunStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT runs can be deleted');
    }

    await this.prisma.payslip.deleteMany({ where: { payrollRunId: id } });
    await this.prisma.payrollRun.delete({ where: { id } });
  }

  // ============================================
  // Payslips
  // ============================================

  async getPayslipsForRun(
    tenantId: string,
    runId: string,
    query: PayslipQueryDto,
  ) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');

    const [data, total] = await Promise.all([
      this.prisma.payslip.findMany({
        where: { tenantId, payrollRunId: runId },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              designation: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { employee: { firstName: 'asc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payslip.count({
        where: { tenantId, payrollRunId: runId },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyPayslips(tenantId: string, employeeId: string) {
    if (!employeeId) {
      throw new BadRequestException(
        'No employee profile linked to this user',
      );
    }

    return this.prisma.payslip.findMany({
      where: {
        tenantId,
        employeeId,
        payrollRun: {
          status: { in: [PayrollRunStatus.APPROVED, PayrollRunStatus.PAID] },
        },
      },
      include: {
        payrollRun: {
          select: {
            month: true,
            year: true,
            status: true,
            periodStart: true,
            periodEnd: true,
            kind: true,
          },
        },
      },
      orderBy: [
        { payrollRun: { year: 'desc' } },
        { payrollRun: { month: 'desc' } },
      ],
    });
  }

  async getPayslip(tenantId: string, id: string) {
    const payslip = await this.prisma.payslip.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            designation: { select: { name: true } },
            department: { select: { name: true } },
            joinDate: true,
            employmentType: true,
            payType: true,
          },
        },
        payrollRun: {
          select: {
            month: true,
            year: true,
            status: true,
            periodStart: true,
            periodEnd: true,
            kind: true,
          },
        },
      },
    });
    if (!payslip) throw new NotFoundException('Payslip not found');
    return payslip;
  }

  async getEmployeePayslips(tenantId: string, employeeId: string) {
    return this.prisma.payslip.findMany({
      where: {
        tenantId,
        employeeId,
        payrollRun: {
          status: { in: [PayrollRunStatus.APPROVED, PayrollRunStatus.PAID] },
        },
      },
      include: {
        payrollRun: {
          select: {
            month: true,
            year: true,
            status: true,
            periodStart: true,
            periodEnd: true,
            kind: true,
          },
        },
      },
      orderBy: [
        { payrollRun: { year: 'desc' } },
        { payrollRun: { month: 'desc' } },
      ],
    });
  }

  async getTenant(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        currency: true,
        name: true,
        legalName: true,
        addressLine1: true,
        city: true,
        country: true,
        email: true,
        phone: true,
        logoUrl: true,
      },
    });
  }

  private async processDailyRun(tenantId: string, id: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, tenantId },
      include: { selectedEmployees: true },
    });
    if (!run || run.kind !== PayrollRunKind.DAILY) {
      throw new NotFoundException('Payroll run not found');
    }
    if (!run.periodStart || !run.periodEnd) {
      throw new BadRequestException('Daily run is missing period dates');
    }
    if (!run.selectedEmployees.length) {
      throw new BadRequestException('No employees selected for this run');
    }

    await this.prisma.payrollRun.update({
      where: { id },
      data: { status: PayrollRunStatus.PROCESSING },
    });

    try {
      await this.prisma.payslip.deleteMany({ where: { payrollRunId: id } });

      let totalGross = 0;
      let totalNet = 0;
      let processedCount = 0;

      for (const selected of run.selectedEmployees) {
        const employeeId = selected.employeeId;

        const settledPayslips = await this.prisma.payslip.findMany({
          where: {
            tenantId,
            employeeId,
            payrollRun: {
              kind: PayrollRunKind.DAILY,
              status: {
                in: [
                  PayrollRunStatus.COMPUTED,
                  PayrollRunStatus.APPROVED,
                  PayrollRunStatus.PAID,
                ],
              },
              id: { not: run.id },
              periodStart: { lte: run.periodEnd },
              periodEnd: { gte: run.periodStart },
            },
          },
          select: {
            payrollRun: { select: { periodStart: true, periodEnd: true } },
          },
        });

        const settledPeriods: SettledDailyPeriod[] = settledPayslips
          .map((s) => s.payrollRun)
          .filter(
            (p): p is { periodStart: Date; periodEnd: Date } =>
              p.periodStart != null && p.periodEnd != null,
          )
          .map((p) => ({
            periodStart: p.periodStart,
            periodEnd: p.periodEnd,
          }));

        const salary = await this.prisma.employeeSalary.findFirst({
          where: {
            tenantId,
            employeeId,
            isActive: true,
            payBasis: 'DAILY',
          },
        });
        if (!salary) {
          throw new BadRequestException(
            'Selected employee has no active daily rate',
          );
        }

        const records = await this.prisma.attendanceRecord.findMany({
          where: {
            tenantId,
            employeeId,
            date: { gte: run.periodStart, lte: run.periodEnd },
          },
          select: { date: true, status: true },
        });

        const presentDays = countUnpaidDailyAttendanceDays(records, settledPeriods);
        const rate = Number(salary.basePay);
        const netPay = Math.round(rate * presentDays * 100) / 100;

        await this.prisma.payslip.create({
          data: {
            tenantId,
            payrollRunId: id,
            employeeId,
            workingDays: 0,
            presentDays,
            leaveDays: 0,
            lopDays: 0,
            otHours: 0,
            basePay: rate,
            earnings: [],
            deductions: [],
            grossPay: netPay,
            totalDeductions: 0,
            netPay,
            otPay: 0,
          },
        });

        totalGross += netPay;
        totalNet += netPay;
        processedCount++;
      }

      return this.prisma.payrollRun.update({
        where: { id },
        data: {
          status: PayrollRunStatus.COMPUTED,
          totalGross: Math.round(totalGross * 100) / 100,
          totalDeductions: 0,
          totalNet: Math.round(totalNet * 100) / 100,
          processedCount,
          processedAt: new Date(),
        },
        include: {
          _count: { select: { payslips: true } },
        },
      });
    } catch (error) {
      await this.prisma.payslip.deleteMany({ where: { payrollRunId: id } });
      await this.prisma.payrollRun.update({
        where: { id },
        data: { status: PayrollRunStatus.DRAFT },
      });
      throw error;
    }
  }
}
