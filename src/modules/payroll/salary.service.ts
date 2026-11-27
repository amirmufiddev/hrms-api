import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EmploymentType, PayrollRunKind, PayrollRunStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSalaryStructureDto,
  UpdateSalaryStructureDto,
  AssignSalaryDto,
  DailyWorkerQueryDto,
} from './dto/payroll.dto';
import {
  countUnpaidDailyAttendanceDays,
  SettledDailyPeriod,
} from './daily-payroll.helpers';

const SETTLED_DAILY_STATUSES: PayrollRunStatus[] = [
  PayrollRunStatus.COMPUTED,
  PayrollRunStatus.APPROVED,
  PayrollRunStatus.PAID,
];

@Injectable()
export class SalaryService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Salary Structures
  // ============================================

  async getStructures(tenantId: string) {
    return this.prisma.salaryStructure.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { employeeSalaries: true } },
      },
    });
  }

  async getStructure(tenantId: string, id: string) {
    const structure = await this.prisma.salaryStructure.findFirst({
      where: { id, tenantId },
      include: {
        employeeSalaries: {
          where: { isActive: true },
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    if (!structure) throw new NotFoundException('Salary structure not found');
    return structure;
  }

  async createStructure(tenantId: string, dto: CreateSalaryStructureDto) {
    const existing = await this.prisma.salaryStructure.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });
    if (existing)
      throw new ConflictException(
        `Salary structure "${dto.name}" already exists`,
      );

    return this.prisma.salaryStructure.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        components: dto.components as any,
      },
    });
  }

  async updateStructure(
    tenantId: string,
    id: string,
    dto: UpdateSalaryStructureDto,
  ) {
    const structure = await this.prisma.salaryStructure.findFirst({
      where: { id, tenantId },
    });
    if (!structure) throw new NotFoundException('Salary structure not found');

    if (dto.name && dto.name !== structure.name) {
      const existing = await this.prisma.salaryStructure.findUnique({
        where: { tenantId_name: { tenantId, name: dto.name } },
      });
      if (existing)
        throw new ConflictException(
          `Salary structure "${dto.name}" already exists`,
        );
    }

    return this.prisma.salaryStructure.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.components !== undefined && {
          components: dto.components as any,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteStructure(tenantId: string, id: string) {
    const structure = await this.prisma.salaryStructure.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { employeeSalaries: true } } },
    });
    if (!structure) throw new NotFoundException('Salary structure not found');
    if (structure._count.employeeSalaries > 0) {
      throw new ConflictException(
        'Cannot delete structure with assigned employees. Deactivate instead.',
      );
    }

    await this.prisma.salaryStructure.delete({ where: { id } });
  }

  // ============================================
  // Employee Salary Assignment
  // ============================================

  async getEmployeeSalary(tenantId: string, employeeId: string) {
    return this.prisma.employeeSalary.findMany({
      where: { tenantId, employeeId },
      include: {
        salaryStructure: { select: { id: true, name: true, components: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async listDailyWorkers(tenantId: string, query: DailyWorkerQueryDto = {}) {
    if (!query.periodStart || !query.periodEnd) {
      return [];
    }

    const start = new Date(query.periodStart);
    const end = new Date(query.periodEnd);
    if (end < start) {
      throw new BadRequestException('Period end must be on or after period start');
    }

    const where: Prisma.EmployeeWhereInput = {
      tenantId,
      status: 'ACTIVE',
      employmentType: EmploymentType.DAILY_WORKER,
      employeeSalaries: {
        some: { isActive: true, payBasis: 'DAILY' },
      },
    };

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    const search = query.search?.trim();
    if (search) {
      where.AND = [
        {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { employeeCode: { contains: search, mode: 'insensitive' } },
            {
              department: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        },
      ];
    }

    const rows = await this.prisma.employee.findMany({
      where,
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        employeeSalaries: {
          where: { isActive: true, payBasis: 'DAILY' },
          select: { basePay: true },
          take: 1,
        },
      },
      orderBy: { firstName: 'asc' },
    });

    if (rows.length === 0) {
      return [];
    }

    const employeeIds = rows.map((r) => r.id);

    const settledPayslips = await this.prisma.payslip.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        payrollRun: {
          kind: PayrollRunKind.DAILY,
          status: { in: SETTLED_DAILY_STATUSES },
          periodStart: { lte: end },
          periodEnd: { gte: start },
        },
      },
      select: {
        employeeId: true,
        payrollRun: { select: { periodStart: true, periodEnd: true } },
      },
    });

    const settledByEmployee = new Map<string, SettledDailyPeriod[]>();
    for (const slip of settledPayslips) {
      if (!slip.payrollRun.periodStart || !slip.payrollRun.periodEnd) continue;
      const list = settledByEmployee.get(slip.employeeId) ?? [];
      list.push({
        periodStart: slip.payrollRun.periodStart,
        periodEnd: slip.payrollRun.periodEnd,
      });
      settledByEmployee.set(slip.employeeId, list);
    }

    const attendanceRows = await this.prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        date: { gte: start, lte: end },
      },
      select: { employeeId: true, date: true, status: true },
    });

    const attendanceByEmployee = new Map<
      string,
      { date: Date; status: string }[]
    >();
    for (const row of attendanceRows) {
      const list = attendanceByEmployee.get(row.employeeId) ?? [];
      list.push({ date: row.date, status: row.status });
      attendanceByEmployee.set(row.employeeId, list);
    }

    const eligibleRows = rows.filter((row) => {
      const settled = settledByEmployee.get(row.id) ?? [];
      const attendance = attendanceByEmployee.get(row.id) ?? [];
      return countUnpaidDailyAttendanceDays(attendance, settled) > 0;
    });

    return eligibleRows.map((row) => ({
      id: row.id,
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      departmentId: row.departmentId,
      departmentName: row.department?.name ?? null,
      dailyRate: Number(row.employeeSalaries[0]?.basePay ?? 0),
    }));
  }

  async listDailyWorkerDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: {
        tenantId,
        isActive: true,
        employees: {
          some: {
            tenantId,
            status: 'ACTIVE',
            employmentType: EmploymentType.DAILY_WORKER,
            employeeSalaries: {
              some: { isActive: true, payBasis: 'DAILY' },
            },
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async assignSalary(
    tenantId: string,
    employeeId: string,
    dto: AssignSalaryDto,
  ) {
    const payBasis = dto.payBasis ?? 'MONTH';

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    if (payBasis === 'WEEK' || payBasis === 'HOUR') {
      throw new BadRequestException('Pay basis is not supported yet');
    }

    if (payBasis === 'DAILY') {
      if (employee.employmentType !== EmploymentType.DAILY_WORKER) {
        throw new BadRequestException(
          'Daily pay basis is only for daily workers',
        );
      }
      if (
        dto.salaryStructureId ||
        dto.effectiveFrom ||
        dto.effectiveTo
      ) {
        throw new BadRequestException(
          'Daily salary cannot include structure or effective dates',
        );
      }

      await this.prisma.employeeSalary.updateMany({
        where: { tenantId, employeeId, isActive: true },
        data: { isActive: false, effectiveTo: new Date() },
      });

      return this.prisma.employeeSalary.create({
        data: {
          tenantId,
          employeeId,
          salaryStructureId: null,
          payBasis: 'DAILY',
          basePay: dto.basePay,
          effectiveFrom: new Date(),
          effectiveTo: null,
        },
        include: {
          salaryStructure: { select: { id: true, name: true } },
        },
      });
    }

    if (!dto.salaryStructureId || !dto.effectiveFrom) {
      throw new BadRequestException(
        'Monthly salary requires structure and effective from date',
      );
    }

    const structure = await this.prisma.salaryStructure.findFirst({
      where: { id: dto.salaryStructureId, tenantId, isActive: true },
    });
    if (!structure) throw new NotFoundException('Salary structure not found');

    await this.prisma.employeeSalary.updateMany({
      where: { tenantId, employeeId, isActive: true },
      data: {
        isActive: false,
        effectiveTo: new Date(dto.effectiveFrom),
      },
    });

    return this.prisma.employeeSalary.create({
      data: {
        tenantId,
        employeeId,
        salaryStructureId: dto.salaryStructureId,
        payBasis: 'MONTH',
        basePay: dto.basePay,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
      include: {
        salaryStructure: { select: { id: true, name: true } },
      },
    });
  }
}
