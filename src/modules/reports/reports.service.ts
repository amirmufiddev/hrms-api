import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmployeeStatus, UserRole, AttendanceStatus } from '@prisma/client';
import {
  AttendanceReportDto,
  LeaveReportDto,
  EmployeeReportDto,
  ReportFormat,
} from './dto/report.dto';
import { buildEmployeeSearchWhere } from '../employees/employee-search.util';
import type { AttendanceExportDto } from '../attendance/dto/attendance.dto';
import type { PayrollExportDto } from '../payroll/dto/payroll.dto';
import { payslipPeriodLabel } from '../payroll/payroll-pdf.service';
import type { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // ATTENDANCE REPORT
  // ============================================================

  async exportAttendance(
    tenantId: string,
    dto: AttendanceExportDto,
    role?: UserRole,
    managerEmployeeId?: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    this.listIsoDatesInclusive(dto.from, dto.to);

    const recordRows = await this.buildAttendanceRecordRows(
      tenantId,
      dto,
      role,
      managerEmployeeId,
    );
    const matrixRows = await this.buildAttendanceMatrixRows(
      tenantId,
      dto,
      role,
      managerEmployeeId,
    );

    const dateRange = `${dto.from}_to_${dto.to}`;
    const baseName = `attendance_report_${dateRange}`;

    if (dto.format === 'csv') {
      return this.buildCsv(recordRows, baseName);
    }

    return this.buildXlsxWorkbook(baseName, [
      { sheetName: 'Attendance Records', rows: recordRows },
      { sheetName: 'Attendance Matrix', rows: matrixRows },
    ]);
  }

  async generateAttendanceReport(
    tenantId: string,
    dto: AttendanceReportDto,
    role?: UserRole,
    managerEmployeeId?: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const rows = await this.buildAttendanceRecordRows(
      tenantId,
      {
        from: dto.from,
        to: dto.to,
        departmentId: dto.departmentId,
        employeeId: dto.employeeId,
        employmentType: dto.employmentType,
        search: dto.search,
      },
      role,
      managerEmployeeId,
    );

    const format = dto.format || ReportFormat.XLSX;
    const dateRange = `${dto.from}_to_${dto.to}`;
    return this.buildFile(rows, `attendance_report_${dateRange}`, format, 'Attendance Report');
  }

  /** @deprecated Use exportAttendance for combined workbook; kept for POST /reports/attendance */
  async generateAttendanceMatrixReport(
    tenantId: string,
    dto: AttendanceExportDto,
    format: ReportFormat,
    role?: UserRole,
    managerEmployeeId?: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const rows = await this.buildAttendanceMatrixRows(
      tenantId,
      dto,
      role,
      managerEmployeeId,
    );
    const dateRange = `${dto.from}_to_${dto.to}`;
    return this.buildFile(rows, `attendance_matrix_${dateRange}`, format, 'Attendance Matrix');
  }

  // ============================================================
  // PAYROLL REPORT
  // ============================================================

  async exportPayroll(
    tenantId: string,
    dto: PayrollExportDto,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    if (!dto.runId && dto.year == null) {
      throw new BadRequestException('Provide runId or year to export payroll report');
    }

    if (dto.runId) {
      const run = await this.prisma.payrollRun.findFirst({
        where: { id: dto.runId, tenantId },
        include: {
          _count: { select: { payslips: true } },
          payslips: {
            include: {
              employee: {
                select: {
                  employeeCode: true,
                  firstName: true,
                  lastName: true,
                  designation: { select: { name: true } },
                  department: { select: { name: true } },
                },
              },
            },
            orderBy: { employee: { firstName: 'asc' } },
          },
        },
      });
      if (!run) {
        throw new NotFoundException('Payroll run not found');
      }

      const periodSlug = this.payrollReportSlug(run);
      const baseName = `payroll_run_${periodSlug}`;
      const summaryRows = [this.buildPayrollRunSummaryRow(run)];
      const payslipRows = run.payslips.map((slip) =>
        this.buildPayslipExportRow(slip, payslipPeriodLabel(run)),
      );

      if (dto.format === 'csv') {
        return this.buildCsv(payslipRows, baseName);
      }

      return this.buildXlsxWorkbook(baseName, [
        { sheetName: 'Run Summary', rows: summaryRows },
        { sheetName: 'Payslips', rows: payslipRows },
      ]);
    }

    const yearStart = new Date(`${dto.year}-01-01T12:00:00.000Z`);
    const yearEnd = new Date(`${dto.year}-12-31T12:00:00.000Z`);

    const where: Prisma.PayrollRunWhereInput = {
      tenantId,
      OR: [
        {
          kind: 'MONTHLY',
          year: dto.year,
          ...(dto.month != null ? { month: dto.month } : {}),
        },
        ...(dto.month == null
          ? [
              {
                kind: 'DAILY' as const,
                periodStart: { gte: yearStart },
                periodEnd: { lte: yearEnd },
              },
            ]
          : []),
      ],
    };

    const runs = await this.prisma.payrollRun.findMany({
      where,
      include: { _count: { select: { payslips: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
    });

    const runIds = runs.map((r) => r.id);
    const payslips =
      runIds.length === 0
        ? []
        : await this.prisma.payslip.findMany({
            where: { tenantId, payrollRunId: { in: runIds } },
            include: {
              employee: {
                select: {
                  employeeCode: true,
                  firstName: true,
                  lastName: true,
                  designation: { select: { name: true } },
                  department: { select: { name: true } },
                },
              },
              payrollRun: {
                select: {
                  kind: true,
                  month: true,
                  year: true,
                  periodStart: true,
                  periodEnd: true,
                  status: true,
                },
              },
            },
            orderBy: [
              { payrollRun: { year: 'desc' } },
              { payrollRun: { month: 'desc' } },
              { employee: { firstName: 'asc' } },
            ],
          });

    const periodLabel =
      dto.month != null ? `${dto.year}_${String(dto.month).padStart(2, '0')}` : String(dto.year);
    const baseName = `payroll_report_${periodLabel}`;
    const runRows = runs.map((run) => this.buildPayrollRunListRow(run));
    const payslipRows = payslips.map((slip) =>
      this.buildPayslipExportRow(slip, payslipPeriodLabel(slip.payrollRun)),
    );

    if (dto.format === 'csv') {
      return this.buildCsv(payslipRows, baseName);
    }

    return this.buildXlsxWorkbook(baseName, [
      { sheetName: 'Payroll Runs', rows: runRows },
      { sheetName: 'Payslips', rows: payslipRows },
    ]);
  }

  private payrollReportSlug(run: {
    kind: string;
    month?: number | null;
    year?: number | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
  }): string {
    if (run.kind === 'DAILY' && run.periodStart && run.periodEnd) {
      const start = run.periodStart instanceof Date ? run.periodStart : new Date(run.periodStart);
      const end = run.periodEnd instanceof Date ? run.periodEnd : new Date(run.periodEnd);
      return `${start.toISOString().slice(0, 10)}_to_${end.toISOString().slice(0, 10)}`;
    }
    const y = run.year ?? 'unknown';
    const m = run.month != null ? String(run.month).padStart(2, '0') : '00';
    return `${y}_${m}`;
  }

  private formatPayrollMoney(value: unknown): number {
    if (value == null) return 0;
    return Number(value);
  }

  private formatPayrollComponentList(value: unknown): string {
    if (!Array.isArray(value)) return '';
    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return '';
        const name = 'name' in item ? String((item as { name: unknown }).name) : '';
        const amount =
          'amount' in item ? this.formatPayrollMoney((item as { amount: unknown }).amount) : 0;
        return name ? `${name}: ${amount}` : '';
      })
      .filter(Boolean)
      .join('; ');
  }

  private buildPayrollRunSummaryRow(run: {
    id: string;
    kind: string;
    month?: number | null;
    year?: number | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    status: string;
    totalGross: unknown;
    totalDeductions: unknown;
    totalNet: unknown;
    processedCount: number;
    remarks?: string | null;
    createdAt: Date;
    processedAt?: Date | null;
    approvedAt?: Date | null;
    _count?: { payslips: number };
  }): Record<string, unknown> {
    return {
      Period: payslipPeriodLabel(run),
      Kind: run.kind,
      Status: run.status,
      Month: run.month ?? '',
      Year: run.year ?? '',
      'Period Start': run.periodStart
        ? (run.periodStart instanceof Date
            ? run.periodStart
            : new Date(run.periodStart)
          )
            .toISOString()
            .slice(0, 10)
        : '',
      'Period End': run.periodEnd
        ? (run.periodEnd instanceof Date ? run.periodEnd : new Date(run.periodEnd))
            .toISOString()
            .slice(0, 10)
        : '',
      'Total Gross': this.formatPayrollMoney(run.totalGross),
      'Total Deductions': this.formatPayrollMoney(run.totalDeductions),
      'Total Net': this.formatPayrollMoney(run.totalNet),
      'Processed Count': run.processedCount,
      'Payslip Count': run._count?.payslips ?? 0,
      Remarks: run.remarks ?? '',
      'Created At': run.createdAt.toISOString(),
      'Processed At': run.processedAt?.toISOString() ?? '',
      'Approved At': run.approvedAt?.toISOString() ?? '',
    };
  }

  private buildPayrollRunListRow(run: {
    kind: string;
    month?: number | null;
    year?: number | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    status: string;
    totalGross: unknown;
    totalDeductions: unknown;
    totalNet: unknown;
    processedCount: number;
    remarks?: string | null;
    _count?: { payslips: number };
  }): Record<string, unknown> {
    return {
      Period: payslipPeriodLabel(run),
      Kind: run.kind,
      Status: run.status,
      Month: run.month ?? '',
      Year: run.year ?? '',
      'Period Start': run.periodStart
        ? (run.periodStart instanceof Date
            ? run.periodStart
            : new Date(run.periodStart)
          )
            .toISOString()
            .slice(0, 10)
        : '',
      'Period End': run.periodEnd
        ? (run.periodEnd instanceof Date ? run.periodEnd : new Date(run.periodEnd))
            .toISOString()
            .slice(0, 10)
        : '',
      'Total Gross': this.formatPayrollMoney(run.totalGross),
      'Total Deductions': this.formatPayrollMoney(run.totalDeductions),
      'Total Net': this.formatPayrollMoney(run.totalNet),
      'Processed Count': run.processedCount,
      'Payslip Count': run._count?.payslips ?? 0,
      Remarks: run.remarks ?? '',
    };
  }

  private buildPayslipExportRow(
    slip: {
      workingDays: number;
      presentDays: unknown;
      leaveDays: number;
      lopDays: number;
      otHours: unknown;
      basePay: unknown;
      otPay: unknown;
      grossPay: unknown;
      totalDeductions: unknown;
      netPay: unknown;
      earnings: unknown;
      deductions: unknown;
      employee: {
        employeeCode: string;
        firstName: string;
        lastName: string;
        department?: { name: string } | null;
        designation?: { name: string } | null;
      };
    },
    runPeriod: string,
  ): Record<string, unknown> {
    const emp = slip.employee;
    return {
      'Run Period': runPeriod,
      'Employee Code': emp.employeeCode,
      'Employee Name': `${emp.firstName} ${emp.lastName}`.trim(),
      Department: emp.department?.name ?? '',
      Designation: emp.designation?.name ?? '',
      'Working Days': slip.workingDays,
      'Present Days': this.formatPayrollMoney(slip.presentDays),
      'Leave Days': slip.leaveDays,
      'LOP Days': slip.lopDays,
      'OT Hours': this.formatPayrollMoney(slip.otHours),
      'Base Pay': this.formatPayrollMoney(slip.basePay),
      'OT Pay': this.formatPayrollMoney(slip.otPay),
      'Gross Pay': this.formatPayrollMoney(slip.grossPay),
      'Total Deductions': this.formatPayrollMoney(slip.totalDeductions),
      'Net Pay': this.formatPayrollMoney(slip.netPay),
      'Earnings Detail': this.formatPayrollComponentList(slip.earnings),
      'Deductions Detail': this.formatPayrollComponentList(slip.deductions),
    };
  }

  private async buildAttendanceRecordRows(
    tenantId: string,
    dto: Pick<
      AttendanceExportDto,
      'from' | 'to' | 'departmentId' | 'employeeId' | 'employmentType' | 'search'
    >,
    role?: UserRole,
    managerEmployeeId?: string,
  ): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = {
      tenantId,
      date: { gte: new Date(dto.from), lte: new Date(dto.to) },
    };
    if (dto.employeeId) where.employeeId = dto.employeeId;
    if (dto.departmentId) {
      where.employee = {
        ...(where.employee as Record<string, unknown> || {}),
        departmentId: dto.departmentId,
      };
    }
    if (dto.employmentType) {
      where.employee = {
        ...(where.employee as Record<string, unknown> || {}),
        employmentType: dto.employmentType,
      };
    }
    if (dto.search?.trim()) {
      where.employee = {
        ...(where.employee as Record<string, unknown> || {}),
        ...buildEmployeeSearchWhere(dto.search),
      };
    }
    if (role === UserRole.MANAGER && managerEmployeeId) {
      where.employee = {
        ...(where.employee as Record<string, unknown> || {}),
        OR: [{ id: managerEmployeeId }, { managerId: managerEmployeeId }],
      };
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { employee: { firstName: 'asc' } }],
    });

    return records.map((r) => ({
      'Employee Code': r.employee.employeeCode,
      'Employee Name': `${r.employee.firstName} ${r.employee.lastName}`,
      Department: r.employee.department?.name || '—',
      Date: new Date(r.date).toLocaleDateString('en-IN'),
      Status: r.status,
      'Clock In': r.clockInTime
        ? new Date(r.clockInTime).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
      'Clock Out': r.clockOutTime
        ? new Date(r.clockOutTime).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
      'Worked Hours': this.minutesToHours(r.workedMinutes),
      'Break Mins': r.breakMinutes,
      'Standard Hours': this.minutesToHours(r.standardWorkMinutes),
      'OT Calculated': this.minutesToHours(r.otMinutesCalculated),
      'OT Approved':
        r.otMinutesApproved != null
          ? this.minutesToHours(r.otMinutesApproved)
          : '—',
      Remarks: r.remarks || '',
    }));
  }

  private async buildAttendanceMatrixRows(
    tenantId: string,
    dto: Pick<
      AttendanceExportDto,
      'from' | 'to' | 'departmentId' | 'employeeId' | 'employmentType' | 'search'
    >,
    role?: UserRole,
    managerEmployeeId?: string,
  ): Promise<Record<string, unknown>[]> {
    const days = this.listIsoDatesInclusive(dto.from, dto.to);

    const andFilters: Prisma.EmployeeWhereInput[] = [
      { tenantId, status: EmployeeStatus.ACTIVE },
    ];
    if (dto.departmentId) andFilters.push({ departmentId: dto.departmentId });
    if (dto.employmentType) andFilters.push({ employmentType: dto.employmentType });
    if (dto.search?.trim()) andFilters.push(buildEmployeeSearchWhere(dto.search));
    if (dto.employeeId) andFilters.push({ id: dto.employeeId });
    if (role === UserRole.MANAGER && managerEmployeeId) {
      andFilters.push({ OR: [{ id: managerEmployeeId }, { managerId: managerEmployeeId }] });
    }

    const employees = await this.prisma.employee.findMany({
      where: { AND: andFilters },
      orderBy: [{ employeeCode: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        employmentType: true,
        department: { select: { name: true } },
      },
    });

    const employeeIds = employees.map((e) => e.id);
    const records =
      employeeIds.length === 0
        ? []
        : await this.prisma.attendanceRecord.findMany({
            where: {
              tenantId,
              employeeId: { in: employeeIds },
              date: { gte: new Date(dto.from), lte: new Date(dto.to) },
            },
            select: { employeeId: true, date: true, status: true },
          });

    const statusByEmployee = new Map<string, Record<string, AttendanceStatus>>();
    for (const record of records) {
      const dateKey = record.date.toISOString().slice(0, 10);
      let row = statusByEmployee.get(record.employeeId);
      if (!row) {
        row = {};
        statusByEmployee.set(record.employeeId, row);
      }
      row[dateKey] = record.status;
    }

    const statusShort: Record<AttendanceStatus, string> = {
      PRESENT: 'H',
      ABSENT: 'A',
      HALF_DAY: '½',
      LEAVE: 'C',
      WFH: 'W',
      HOLIDAY: 'L',
    };

    return employees.map((employee) => {
      const cells = statusByEmployee.get(employee.id) ?? {};
      const row: Record<string, unknown> = {
        'Employee Code': employee.employeeCode,
        'Employee Name': `${employee.firstName} ${employee.lastName}`,
        Department: employee.department?.name ?? '—',
        'Employment Type': employee.employmentType,
      };
      for (const day of days) {
        const status = cells[day];
        row[day] = status ? statusShort[status] ?? status : '·';
      }
      return row;
    });
  }

  // ============================================================
  // LEAVE REPORT
  // ============================================================

  async generateLeaveReport(
    tenantId: string,
    dto: LeaveReportDto,
    role?: UserRole,
    employeeId?: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const year = dto.year ? parseInt(dto.year, 10) : new Date().getFullYear();

    const where: Record<string, unknown> = { tenantId, year };
    if (dto.employeeId) where.employeeId = dto.employeeId;
    if (dto.departmentId) {
      where.employee = { ...(where.employee as Record<string, unknown> || {}), departmentId: dto.departmentId };
    }
    // Scope MANAGER to direct reports only
    if (role === UserRole.MANAGER && employeeId) {
      where.employee = { ...(where.employee as Record<string, unknown> || {}), managerId: employeeId };
    }

    const balances = await this.prisma.leaveBalance.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
        leaveType: { select: { name: true, code: true } },
      },
      orderBy: [
        { employee: { firstName: 'asc' } },
        { leaveType: { name: 'asc' } },
      ],
    });

    const rows = balances.map((b) => ({
      'Employee Code': b.employee.employeeCode,
      'Employee Name': `${b.employee.firstName} ${b.employee.lastName}`,
      Department: b.employee.department?.name || '—',
      Year: b.year,
      'Leave Type': b.leaveType.name,
      'Leave Code': b.leaveType.code,
      'Total Days': b.totalDays,
      'Used Days': b.usedDays,
      'Pending Days': b.pendingDays,
      'Carried Over': b.carriedOver,
      'Available': Number(b.totalDays) - Number(b.usedDays) - Number(b.pendingDays),
    }));

    const format = dto.format || ReportFormat.XLSX;
    return this.buildFile(rows, `leave_report_${year}`, format, 'Leave Balances');
  }

  // ============================================================
  // EMPLOYEE REPORT
  // ============================================================

  async generateEmployeeReport(
    tenantId: string,
    dto: EmployeeReportDto,
    role?: UserRole,
    employeeId?: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const where: Record<string, unknown> = { tenantId };
    if (dto.departmentId) where.departmentId = dto.departmentId;
    if (dto.status) where.status = dto.status;
    if (dto.employmentType) where.employmentType = dto.employmentType;
    // Scope MANAGER to direct reports only
    if (role === UserRole.MANAGER && employeeId) {
      where.managerId = employeeId;
    }

    const employees = await this.prisma.employee.findMany({
      where,
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        manager: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const rows = employees.map((e) => ({
      'Employee Code': e.employeeCode,
      'First Name': e.firstName,
      'Last Name': e.lastName,
      Email: e.email,
      Phone: e.phone || '—',
      Department: e.department?.name || '—',
      Designation: e.designation?.name || '—',
      'Employment Type': e.employmentType,
      'Pay Type': e.payType,
      Status: e.status,
      'Join Date': new Date(e.joinDate).toLocaleDateString('en-IN'),
      'Exit Date': e.exitDate
        ? new Date(e.exitDate).toLocaleDateString('en-IN')
        : '—',
      Manager: e.manager
        ? `${e.manager.firstName} ${e.manager.lastName}`
        : '—',
      'Hourly Rate': e.hourlyRate != null ? Number(e.hourlyRate) : '—',
      'OT Multiplier': Number(e.otMultiplier),
    }));

    const format = dto.format || ReportFormat.XLSX;
    return this.buildFile(rows, 'employee_report', format, 'Employees');
  }

  // ============================================================
  // FILE BUILDER
  // ============================================================

  private async buildFile(
    rows: Record<string, unknown>[],
    baseName: string,
    format: ReportFormat,
    sheetName: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    if (format === ReportFormat.CSV) {
      return this.buildCsv(rows, baseName);
    }
    return this.buildXlsx(rows, baseName, sheetName);
  }

  private buildCsv(
    rows: Record<string, unknown>[],
    baseName: string,
  ): { buffer: Buffer; filename: string; contentType: string } {
    if (rows.length === 0) {
      return {
        buffer: Buffer.from('No data found', 'utf-8'),
        filename: `${baseName}.csv`,
        contentType: 'text/csv',
      };
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val == null) return '';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(','),
      ),
    ];

    return {
      buffer: Buffer.from(csvLines.join('\n'), 'utf-8'),
      filename: `${baseName}.csv`,
      contentType: 'text/csv',
    };
  }

  private async buildXlsx(
    rows: Record<string, unknown>[],
    baseName: string,
    sheetName: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    return this.buildXlsxWorkbook(baseName, [{ sheetName, rows }]);
  }

  private async buildXlsxWorkbook(
    baseName: string,
    sheets: Array<{ sheetName: string; rows: Record<string, unknown>[] }>,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HRMS';
    workbook.created = new Date();

    for (const { sheetName, rows } of sheets) {
      this.appendRowsToWorksheet(workbook.addWorksheet(sheetName), rows);
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      filename: `${baseName}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private appendRowsToWorksheet(
    sheet: ExcelJS.Worksheet,
    rows: Record<string, unknown>[],
  ): void {
    if (rows.length === 0) {
      sheet.addRow(['No data found']);
      return;
    }

    const headers = Object.keys(rows[0]);
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        bottom: { style: 'thin' },
      };
    });

    for (const row of rows) {
      const values = headers.map((h) => {
        const val = row[h];
        if (val == null) return '';
        return val;
      });
      sheet.addRow(values);
    }

    sheet.columns.forEach((column) => {
      let maxWidth = 10;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const cellLength = cell.value ? String(cell.value).length : 0;
        maxWidth = Math.max(maxWidth, Math.min(cellLength + 2, 40));
      });
      column.width = maxWidth;
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private minutesToHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  private listIsoDatesInclusive(from: string, to: string): string[] {
    const start = new Date(`${from}T12:00:00.000Z`);
    const end = new Date(`${to}T12:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      throw new BadRequestException('Invalid date range');
    }
    const days: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days;
  }
}
