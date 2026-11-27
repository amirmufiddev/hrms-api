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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import {
  CreateLeaveRequestDto,
  ApproveLeaveDto,
  RejectLeaveDto,
  LeaveRequestQueryDto,
  LeaveBalanceQueryDto,
  CreateLeaveTypeDto,
  UpdateLeaveBalanceDto,
  AdminLeaveRequestQueryDto,
  InitializeBalancesDto,
} from './dto/leave.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

@ApiTags('leave')
@ApiBearerAuth()
@Controller('leave')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeaveController {
  constructor(private leaveService: LeaveService) { }

  /**
   * Get leave types
   * GET /api/leave/types
   */
  @Get('types')
  @ApiOperation({ summary: 'Get leave types' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLeaveTypes(@CurrentUser() user: AuthenticatedUser) {
    return this.leaveService.getLeaveTypes(user.tenantId);
  }

  /**
   * Get my leave balances
   * GET /api/leave/balances/me
   */
  @Get('balances/me')
  @ApiOperation({ summary: 'Get my leave balances' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyBalances(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LeaveBalanceQueryDto,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.leaveService.getBalances(user.tenantId, user.employeeId, query.year);
  }

  /**
   * Get my leave requests
   * GET /api/leave/requests/me
   */
  @Get('requests/me')
  @ApiOperation({ summary: 'Get my leave requests' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LeaveRequestQueryDto,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.leaveService.getMyRequests(user.tenantId, user.employeeId, query);
  }

  /**
   * Get pending approvals (for managers)
   * GET /api/leave/requests/pending-approvals
   */
  @Get('requests/pending-approvals')
  @ApiOperation({ summary: 'Get pending leave approvals' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('leave:approve')
  async getPendingApprovals(@CurrentUser() user: AuthenticatedUser) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.leaveService.getPendingApprovals(
      user.tenantId,
      user.employeeId,
      user.role,
    );
  }

  /**
   * Get leave approval statistics (pending, approved today, rejected today)
   * GET /api/leave/requests/approval-stats
   */
  @Get('requests/approval-stats')
  @ApiOperation({ summary: 'Get leave approval statistics' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('leave:approve')
  async getApprovalStats(@CurrentUser() user: AuthenticatedUser) {
    return this.leaveService.getApprovalStats(
      user.tenantId,
      user.employeeId,
      user.role,
    );
  }

  /**
   * Create a leave request
   * POST /api/leave/requests
   */
  @Post('requests')
  @ApiOperation({ summary: 'Create leave request' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.leaveService.createRequest(user.tenantId, user.employeeId, dto);
  }

  /**
   * Cancel a leave request
   * POST /api/leave/requests/:id/cancel
   */
  @Post('requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel leave request' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async cancelRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.leaveService.cancelRequest(user.tenantId, id, user.employeeId);
  }

  /**
   * Approve a leave request
   * POST /api/leave/requests/:id/approve
   */
  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Approve leave request' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('leave:approve')
  async approveRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveLeaveDto,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.leaveService.approveRequest(user.tenantId, id, user.employeeId, user.role, dto);
  }

  /**
   * Reject a leave request
   * POST /api/leave/requests/:id/reject
   */
  @Post('requests/:id/reject')
  @ApiOperation({ summary: 'Reject leave request' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('leave:approve')
  async rejectRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectLeaveDto,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.leaveService.rejectRequest(user.tenantId, id, user.employeeId, user.role, dto);
  }

  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================

  /**
   * Create a leave type (Admin)
   * POST /api/leave/admin/types
   */
  @Post('admin/types')
  @ApiOperation({ summary: 'Create leave type' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('leave:manage')
  async createLeaveType(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeaveTypeDto,
  ) {
    return this.leaveService.createLeaveType(user.tenantId, dto);
  }

  /**
   * Update a leave type (Admin)
   * PUT /api/leave/admin/types/:id
   */
  @Put('admin/types/:id')
  @ApiOperation({ summary: 'Update leave type' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('leave:manage')
  async updateLeaveType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateLeaveTypeDto,
  ) {
    return this.leaveService.updateLeaveType(user.tenantId, id, dto);
  }

  /**
   * Delete a leave type (Admin)
   * DELETE /api/leave/admin/types/:id
   */
  @Delete('admin/types/:id')
  @ApiOperation({ summary: 'Delete leave type' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('leave:manage')
  async deleteLeaveType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.leaveService.deleteLeaveType(user.tenantId, id);
  }

  /**
   * Get all employee balances (Admin)
   * GET /api/leave/admin/balances
   */
  @Get('admin/balances')
  @ApiOperation({ summary: 'Get all employee balances' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('leave:manage')
  async getAllBalances(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LeaveBalanceQueryDto,
  ) {
    return this.leaveService.getAllBalances(user.tenantId, query.year);
  }

  /**
   * Get employee balance (Admin)
   * GET /api/leave/admin/balances/:employeeId
   */
  @Get('admin/balances/:employeeId')
  @ApiOperation({ summary: 'Get employee leave balance' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('leave:manage')
  async getEmployeeBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Query() query: LeaveBalanceQueryDto,
  ) {
    return this.leaveService.getBalances(user.tenantId, employeeId, query.year);
  }

  /**
   * Update employee balance (Admin)
   * PUT /api/leave/admin/balances/:employeeId/:leaveTypeId
   */
  @Put('admin/balances/:employeeId/:leaveTypeId')
  @ApiOperation({ summary: 'Update employee leave balance' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('leave:manage')
  async updateEmployeeBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Param('leaveTypeId') leaveTypeId: string,
    @Query('year') year: number,
    @Body() dto: UpdateLeaveBalanceDto,
  ) {
    return this.leaveService.updateBalance(
      user.tenantId,
      employeeId,
      leaveTypeId,
      year || new Date().getFullYear(),
      dto,
    );
  }

  /**
   * Initialize balances for all employees for a year (Admin)
   * POST /api/leave/admin/balances/initialize
   */
  @Post('admin/balances/initialize')
  @ApiOperation({ summary: 'Initialize employee leave balances' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('leave:manage')
  async initializeBalances(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InitializeBalancesDto,
  ) {
    return this.leaveService.initializeBalances(user.tenantId, dto);
  }

  /**
   * Get all leave requests (Admin)
   * GET /api/leave/admin/requests
   */
  @Get('admin/requests')
  @ApiOperation({ summary: 'Get all leave requests' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('leave:manage')
  async getAllRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminLeaveRequestQueryDto,
  ) {
    return this.leaveService.getAllRequests(user.tenantId, query);
  }

  /**
   * Get leave analytics (Admin)
   * GET /api/leave/admin/analytics
   */
  @Get('admin/analytics')
  @ApiOperation({ summary: 'Get leave analytics' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('leave:manage')
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('year') year?: number,
  ) {
    return this.leaveService.getAnalytics(user.tenantId, year);
  }
}
