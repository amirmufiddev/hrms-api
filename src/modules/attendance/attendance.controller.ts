import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AttendanceService } from './attendance.service';
import { PunchQueueService } from './punch-queue.service';
import { DeviceLogPullService } from './device-log-pull.service';
import { ReportsService } from '../reports/reports.service';
import {
  ClockInDto,
  ClockOutDto,
  ApproveOtDto,
  AttendanceQueryDto,
  AttendanceSummaryQueryDto,
  AttendanceMatrixQueryDto,
  PayableHoursQueryDto,
  ManualAttendanceDto,
  AttendanceExportDto,
} from './dto/attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(
    private attendanceService: AttendanceService,
    private prisma: PrismaService,
    private punchJobs: PunchQueueService,
    private reportsService: ReportsService,
    private devicePulls: DeviceLogPullService,
  ) {}

  /**
   * Clock in for current employee
   * POST /api/attendance/clock-in
   */
  @Post('clock-in')
  @ApiOperation({ summary: 'Clock in for employee' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clockIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ClockInDto,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.attendanceService.clockIn(user.tenantId, user.employeeId, dto);
  }

  /**
   * Clock out for current employee
   * POST /api/attendance/clock-out
   */
  @Post('clock-out')
  @ApiOperation({ summary: 'Clock out for employee' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clockOut(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ClockOutDto,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.attendanceService.clockOut(user.tenantId, user.employeeId, dto);
  }

  /**
   * Get today's attendance status for current employee
   * GET /api/attendance/today
   */
  @Get('today')
  @ApiOperation({ summary: 'Get today attendance status' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTodayStatus(@CurrentUser() user: AuthenticatedUser) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.attendanceService.getTodayStatus(user.tenantId, user.employeeId);
  }

  /**
   * Get my attendance records
   * GET /api/attendance/me
   */
  @Get('me')
  @ApiOperation({ summary: 'Get my attendance records' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AttendanceQueryDto,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.attendanceService.getMyAttendance(user.tenantId, user.employeeId, query);
  }

  /**
   * Get attendance summary
   * GET /api/attendance/summary
   */
  @Get('summary')
  @ApiOperation({ summary: 'Get attendance summary' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('attendance:read')
  async getAttendanceSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AttendanceSummaryQueryDto,
  ) {
    return this.attendanceService.getAttendanceSummary(user.tenantId, query);
  }

  /**
   * Matrix absensi semua karyawan (periode + filter)
   * GET /api/attendance/matrix
   */
  @Get('matrix')
  @ApiOperation({ summary: 'Attendance matrix for all employees' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('attendance:read')
  async getAttendanceMatrix(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AttendanceMatrixQueryDto,
  ) {
    const managerId =
      user.role === UserRole.MANAGER && user.employeeId ? user.employeeId : undefined;
    return this.attendanceService.getAttendanceMatrix(user.tenantId, query, managerId);
  }

  /**
   * Export attendance report (Excel/CSV)
   * POST /api/attendance/export
   */
  @Post('export')
  @ApiOperation({ summary: 'Download attendance report (Excel/CSV)' })
  @ApiResponse({ status: 200, description: 'File download' })
  async exportAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AttendanceExportDto,
    @Res() res: Response,
  ) {
    const canReadTeam =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.HR_ADMIN ||
      (user.permissions?.includes('attendance:read') ?? false);

    const selfExport =
      user.employeeId &&
      dto.employeeId === user.employeeId;

    if (!canReadTeam && !selfExport) {
      throw new ForbiddenException('Not allowed to export attendance report');
    }

    if (!canReadTeam && selfExport) {
      dto.departmentId = undefined;
      dto.search = undefined;
      dto.employmentType = undefined;
    }

    if (
      user.role === UserRole.MANAGER &&
      dto.employeeId &&
      user.employeeId &&
      dto.employeeId !== user.employeeId
    ) {
      const employee = await this.prisma.employee.findFirst({
        where: {
          id: dto.employeeId,
          tenantId: user.tenantId,
          managerId: user.employeeId,
        },
      });
      if (!employee) {
        throw new ForbiddenException('You can only export attendance for your direct reports');
      }
    }

    const managerId =
      user.role === UserRole.MANAGER && user.employeeId ? user.employeeId : undefined;

    const result = await this.reportsService.exportAttendance(
      user.tenantId,
      dto,
      user.role,
      managerId,
    );

    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.buffer.length,
    });
    res.end(result.buffer);
  }

  /**
   * Create manual attendance entry
   * POST /api/attendance/manual
   */
  @Post('manual')
  @ApiOperation({ summary: 'Create manual attendance entry' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('attendance:approve')
  async createManualAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ManualAttendanceDto,
  ) {
    return this.attendanceService.createManualAttendance(user.tenantId, dto);
  }

  /**
   * Get pending OT approvals
   * GET /api/attendance/pending-ot-approvals
   */
  @Get('pending-ot-approvals')
  @ApiOperation({ summary: 'Get pending OT approvals' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('attendance:approve')
  async getPendingOtApprovals(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.getPendingOtApprovals(user);
  }

  /**
   * Get OT approval statistics (pending, approved today, total OT minutes pending)
   * GET /api/attendance/ot-approval-stats
   */
  @Get('ot-approval-stats')
  @ApiOperation({ summary: 'Get OT approval statistics' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('attendance:approve')
  async getOtApprovalStats(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.getOtApprovalStats(user);
  }

  /**
   * List attendance records for the team page
   * GET /api/attendance
   */
  @Get()
  @ApiOperation({ summary: 'List attendance records' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('attendance:read')
  async listAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AttendanceQueryDto,
  ) {
    if (user.role === UserRole.MANAGER && query.employeeId && query.employeeId !== user.employeeId) {
      const employee = await this.prisma.employee.findFirst({
        where: {
          id: query.employeeId,
          tenantId: user.tenantId,
          managerId: user.employeeId,
        },
      });
      if (!employee) {
        throw new ForbiddenException('You can only view attendance for your direct reports');
      }
    }

    const managerId = user.role === UserRole.MANAGER ? user.employeeId : undefined;
    return this.attendanceService.listAttendance(user.tenantId, query, managerId);
  }

  @Get('punch-jobs')
  @ApiOperation({ summary: 'Antrean tap mesin yang gagal' })
  @RequirePermissions('attendance:read')
  listPunchJobs(@CurrentUser() user: AuthenticatedUser) {
    return this.punchJobs.list(user.tenantId);
  }

  @Get('device-pulls')
  @ApiOperation({ summary: 'Status tarikan log mesin absen' })
  @RequirePermissions('attendance:read')
  listDevicePulls(@CurrentUser() user: AuthenticatedUser) {
    return this.devicePulls.list(user.tenantId);
  }

  @Post('punch-jobs/:id/retry')
  @ApiOperation({ summary: 'Ulangi pekerjaan tap yang gagal' })
  @RequirePermissions('attendance:read')
  retryPunchJob(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.punchJobs.retry(user.tenantId, id);
  }

  /**
   * Get attendance for a specific employee
   * GET /api/attendance/:employeeId
   */
  @Get(':employeeId')
  @ApiOperation({ summary: 'Get employee attendance records' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('attendance:read')
  async getEmployeeAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Query() query: AttendanceQueryDto,
  ) {
    // Authorization check: Managers can only view their direct reports' attendance
    if (user.role === UserRole.MANAGER) {
      // Allow viewing own attendance or direct reports only
      if (employeeId !== user.employeeId) {
        const employee = await this.prisma.employee.findFirst({
          where: {
            id: employeeId,
            tenantId: user.tenantId,
            managerId: user.employeeId,
          },
        });

        if (!employee) {
          throw new ForbiddenException(
            'You can only view attendance for your direct reports',
          );
        }
      }
    }
    // SUPER_ADMIN and HR_ADMIN can view any employee's attendance

    return this.attendanceService.getEmployeeAttendance(user.tenantId, employeeId, query);
  }

  /**
   * Get payable hours for an employee
   * GET /api/attendance/:employeeId/payable
   */
  @Get(':employeeId/payable')
  @ApiOperation({ summary: 'Get employee payable hours' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('attendance:read')
  async getPayableHours(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Query() query: PayableHoursQueryDto,
  ) {
    // Authorization check: Managers can only view their direct reports' payable hours
    if (user.role === UserRole.MANAGER) {
      // Allow viewing own data or direct reports only
      if (employeeId !== user.employeeId) {
        const employee = await this.prisma.employee.findFirst({
          where: {
            id: employeeId,
            tenantId: user.tenantId,
            managerId: user.employeeId,
          },
        });

        if (!employee) {
          throw new ForbiddenException(
            'You can only view payable hours for your direct reports',
          );
        }
      }
    }
    // SUPER_ADMIN and HR_ADMIN can view any employee's payable hours

    return this.attendanceService.getPayableHours(user.tenantId, employeeId, query);
  }

  /**
   * Approve OT for an attendance record
   * POST /api/attendance/:id/approve-ot
   */
  @Post(':id/approve-ot')
  @ApiOperation({ summary: 'Approve overtime for attendance' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('attendance:approve')
  async approveOt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveOtDto,
  ) {
    return this.attendanceService.approveOt(user.tenantId, id, dto, user.employeeId);
  }

  /**
   * Reject OT for an attendance record
   * POST /api/attendance/:id/reject-ot
   */
  @Post(':id/reject-ot')
  @ApiOperation({ summary: 'Reject overtime for attendance' })
  @ApiResponse({ status: 201, description: 'Rejected' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('attendance:approve')
  async rejectOt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: { remarks?: string },
  ) {
    return this.attendanceService.rejectOt(user.tenantId, id, dto?.remarks, user.employeeId);
  }
}
