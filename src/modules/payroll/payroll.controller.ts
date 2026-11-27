import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../common/types/jwt-payload.type";
import { SalaryService } from "./salary.service";
import { PayrollPdfService } from "./payroll-pdf.service";
import { PayrollService } from "./payroll.service";
import { ReportsService } from "../reports/reports.service";
import {
  CreateSalaryStructureDto,
  UpdateSalaryStructureDto,
  AssignSalaryDto,
  CreatePayrollRunDto,
  CreateDailyPayrollRunDto,
  PayrollRunQueryDto,
  PayslipQueryDto,
  DailyWorkerQueryDto,
  PayrollExportDto,
} from "./dto/payroll.dto";

@ApiTags("payroll")
@ApiBearerAuth()
@Controller("payroll")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollController {
  constructor(
    private salaryService: SalaryService,
    private payrollService: PayrollService,
    private pdfService: PayrollPdfService,
    private reportsService: ReportsService,
  ) {}

  // ============================================
  // Salary Structures
  // ============================================

  @Get("structures")
  @ApiOperation({ summary: "Get all salary structures" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @RequirePermissions("payroll:manage")
  async getStructures(@CurrentUser() user: AuthenticatedUser) {
    return this.salaryService.getStructures(user.tenantId);
  }

  @Get("structures/:id")
  @ApiOperation({ summary: "Get salary structure by ID" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  @RequirePermissions("payroll:manage")
  async getStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.salaryService.getStructure(user.tenantId, id);
  }

  @Post("structures")
  @ApiOperation({ summary: "Create salary structure" })
  @ApiResponse({ status: 201, description: "Created" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @RequirePermissions("payroll:manage")
  async createStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalaryStructureDto,
  ) {
    return this.salaryService.createStructure(user.tenantId, dto);
  }

  @Put("structures/:id")
  @ApiOperation({ summary: "Update salary structure" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  @RequirePermissions("payroll:manage")
  async updateStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateSalaryStructureDto,
  ) {
    return this.salaryService.updateStructure(user.tenantId, id, dto);
  }

  @Delete("structures/:id")
  @ApiOperation({ summary: "Delete salary structure" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  @RequirePermissions("payroll:manage")
  async deleteStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.salaryService.deleteStructure(user.tenantId, id);
    return { message: "Salary structure deleted" };
  }

  // ============================================
  // Employee Salary Assignment
  // ============================================

  @Get("employees/:employeeId/salary")
  @ApiOperation({ summary: "Get employee salary details" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  @RequirePermissions("payroll:read")
  async getEmployeeSalary(
    @CurrentUser() user: AuthenticatedUser,
    @Param("employeeId") employeeId: string,
  ) {
    return this.salaryService.getEmployeeSalary(user.tenantId, employeeId);
  }

  @Post("employees/:employeeId/salary")
  @ApiOperation({ summary: "Assign salary to employee" })
  @ApiResponse({ status: 201, description: "Created" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  @RequirePermissions("payroll:manage")
  async assignSalary(
    @CurrentUser() user: AuthenticatedUser,
    @Param("employeeId") employeeId: string,
    @Body() dto: AssignSalaryDto,
  ) {
    return this.salaryService.assignSalary(user.tenantId, employeeId, dto);
  }

  // ============================================
  // Payroll Runs
  // ============================================

  @Get("daily-workers/departments")
  @ApiOperation({ summary: "Departments that have eligible daily workers" })
  @RequirePermissions("payroll:process")
  async listDailyWorkerDepartments(@CurrentUser() user: AuthenticatedUser) {
    return this.salaryService.listDailyWorkerDepartments(user.tenantId);
  }

  @Get("daily-workers")
  @ApiOperation({ summary: "List daily workers eligible for payroll runs" })
  @RequirePermissions("payroll:process")
  async listDailyWorkers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DailyWorkerQueryDto,
  ) {
    return this.salaryService.listDailyWorkers(user.tenantId, query);
  }

  @Post("runs/daily")
  @ApiOperation({ summary: "Create daily payroll run for selected workers" })
  @RequirePermissions("payroll:process")
  async createDailyRun(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDailyPayrollRunDto,
  ) {
    return this.payrollService.createDailyRun(user.tenantId, dto);
  }

  @Post("export")
  @ApiOperation({ summary: "Download payroll report (Excel/CSV)" })
  @ApiResponse({ status: 200, description: "File download" })
  @RequirePermissions("payroll:read")
  async exportPayroll(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PayrollExportDto,
    @Res() res: Response,
  ) {
    const result = await this.reportsService.exportPayroll(user.tenantId, dto);
    res.set({
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Length": result.buffer.length,
    });
    res.end(result.buffer);
  }

  @Get("runs")
  @ApiOperation({ summary: "Get all payroll runs" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @RequirePermissions("payroll:read")
  async getRuns(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PayrollRunQueryDto,
  ) {
    return this.payrollService.getRuns(user.tenantId, query);
  }

  @Get("runs/:id")
  @ApiOperation({ summary: "Get payroll run by ID" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  @RequirePermissions("payroll:read")
  async getRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.payrollService.getRun(user.tenantId, id);
  }

  @Post("runs")
  @ApiOperation({ summary: "Create payroll run" })
  @ApiResponse({ status: 201, description: "Created" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @RequirePermissions("payroll:process")
  async createRun(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayrollRunDto,
  ) {
    return this.payrollService.createRun(user.tenantId, dto);
  }

  @Post("runs/:id/process")
  @ApiOperation({ summary: "Process payroll run" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  @RequirePermissions("payroll:process")
  async processRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.payrollService.processRun(user.tenantId, id);
  }

  @Post("runs/:id/approve")
  @ApiOperation({ summary: "Approve payroll run" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  @RequirePermissions("payroll:manage")
  async approveRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.payrollService.approveRun(user.tenantId, id);
  }

  @Post("runs/:id/pay")
  @ApiOperation({ summary: "Mark payroll run as paid" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  @RequirePermissions("payroll:manage")
  async markAsPaid(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.payrollService.markAsPaid(user.tenantId, id);
  }

  @Delete("runs/:id")
  @ApiOperation({
    summary:
      "Delete payroll run (SUPER_ADMIN can delete any status; others only DRAFT)",
  })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  @RequirePermissions("payroll:manage")
  async deleteRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.payrollService.deleteRun(user.tenantId, id, user.role);
    return { message: "Payroll run deleted" };
  }

  // ============================================
  // Payslips
  // ============================================

  @Get("runs/:runId/payslips")
  @ApiOperation({ summary: "Get payslips for run" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  @RequirePermissions("payroll:read")
  async getPayslipsForRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param("runId") runId: string,
    @Query() query: PayslipQueryDto,
  ) {
    return this.payrollService.getPayslipsForRun(user.tenantId, runId, query);
  }

  // Static route before parameterized
  @Get("my-payslips")
  @ApiOperation({ summary: "Get my payslips" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMyPayslips(@CurrentUser() user: AuthenticatedUser) {
    return this.payrollService.getMyPayslips(user.tenantId, user.employeeId!);
  }

  @Get("employees/:employeeId/payslips")
  @ApiOperation({
    summary: "Get all payslips for a specific employee (admin/HR only)",
  })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @RequirePermissions("payroll:read")
  async getEmployeePayslips(
    @CurrentUser() user: AuthenticatedUser,
    @Param("employeeId") employeeId: string,
  ) {
    return this.payrollService.getEmployeePayslips(user.tenantId, employeeId);
  }

  // NOTE: This route must be declared BEFORE /payslips/:id to avoid route conflict
  @Get("payslips/:id/pdf")
  @ApiOperation({ summary: "Download payslip as PDF" })
  @ApiResponse({ status: 200, description: "PDF file" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  async downloadPayslipPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const payslip = await this.payrollService.getPayslip(user.tenantId, id);
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.HR_ADMIN &&
      payslip.employeeId !== user.employeeId
    ) {
      throw new ForbiddenException("You can only download your own payslips");
    }

    const month = payslip.payrollRun?.month ?? 0;
    const year = payslip.payrollRun?.year ?? "";
    const monthNames = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const filename = `payslip-${payslip.employee?.employeeCode ?? "emp"}-${monthNames[month]}-${year}.pdf`;

    const tenant = await this.payrollService.getTenant(user.tenantId);
    const pdfBuffer = await this.pdfService.generatePayslipPdf({
      ...payslip,
      currency: tenant?.currency || "IDR",
      company: {
        name: tenant?.name || "HRMS",
        legalName:
          tenant?.legalName ||
          tenant?.name ||
          "Perusahaan",
        address:
          [tenant?.addressLine1, tenant?.city].filter(Boolean).join(", ") ||
          "Jakarta, Indonesia",
        email: tenant?.email || "hr@example.com",
        phone: tenant?.phone || "",
        logoUrl: tenant?.logoUrl || undefined,
      },
    } as any);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
  }

  @Get("payslips/:id")
  @ApiOperation({ summary: "Get payslip by ID" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Not found" })
  async getPayslip(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    const payslip = await this.payrollService.getPayslip(user.tenantId, id);
    // Regular employees can only view their own payslips
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.HR_ADMIN &&
      payslip.employeeId !== user.employeeId
    ) {
      throw new ForbiddenException("You can only view your own payslips");
    }
    return payslip;
  }
}
