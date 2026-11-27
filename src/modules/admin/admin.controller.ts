import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateOtRuleDto, UpdateOtRuleDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  /**
   * Get dashboard statistics
   * GET /api/admin/dashboard
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('admin:read')
  async getDashboardStats(@CurrentUser() user: AuthenticatedUser) {
    if (user.role === UserRole.MANAGER && user.employeeId) {
      return this.adminService.getManagerDashboardStats(user.tenantId, user.employeeId);
    }
    return this.adminService.getDashboardStats(user.tenantId);
  }

  /**
   * Get analytics data for charts
   * GET /api/admin/analytics
   */
  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics data for dashboard charts' })
  @ApiResponse({ status: 200, description: 'Success' })
  @RequirePermissions('admin:read')
  async getAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.getAnalytics(user.tenantId);
  }

  /**
   * Get all OT rules
   * GET /api/admin/settings/ot-rules
   */
  @Get('settings/ot-rules')
  @ApiOperation({ summary: 'Get all OT rules' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('admin:read')
  async getOtRules(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.getOtRules(user.tenantId);
  }

  /**
   * Get OT rule by ID
   * GET /api/admin/settings/ot-rules/:id
   */
  @Get('settings/ot-rules/:id')
  @ApiOperation({ summary: 'Get OT rule by ID' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('admin:read')
  async getOtRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.adminService.getOtRule(user.tenantId, id);
  }

  /**
   * Create OT rule
   * POST /api/admin/settings/ot-rules
   */
  @Post('settings/ot-rules')
  @ApiOperation({ summary: 'Create OT rule' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('admin:manage')
  async createOtRule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOtRuleDto,
  ) {
    return this.adminService.createOtRule(user.tenantId, dto);
  }

  /**
   * Update OT rule
   * PUT /api/admin/settings/ot-rules/:id
   */
  @Put('settings/ot-rules/:id')
  @ApiOperation({ summary: 'Update OT rule' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('admin:manage')
  async updateOtRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOtRuleDto,
  ) {
    return this.adminService.updateOtRule(user.tenantId, id, dto);
  }

  /**
   * Delete OT rule
   * DELETE /api/admin/settings/ot-rules/:id
   */
  @Delete('settings/ot-rules/:id')
  @ApiOperation({ summary: 'Delete OT rule' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('admin:manage')
  async deleteOtRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteOtRule(user.tenantId, id);
  }
}
