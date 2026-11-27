import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegularizationService } from './regularization.service';
import {
  CreateRegularizationDto,
  ApproveRegularizationDto,
  RegularizationQueryDto,
} from './dto/regularization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance/regularization')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RegularizationController {
  constructor(private regularizationService: RegularizationService) {}

  /**
   * Create a regularization request
   * POST /api/attendance/regularization
   */
  @Post()
  @ApiOperation({ summary: 'Create attendance regularization request' })
  @ApiResponse({ status: 201, description: 'Regularization request created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRegularizationDto,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.regularizationService.create(
      user.tenantId,
      user.employeeId,
      dto,
    );
  }

  /**
   * Get my regularization requests
   * GET /api/attendance/regularization/me
   */
  @Get('me')
  @ApiOperation({ summary: 'Get my regularization requests' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RegularizationQueryDto,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.regularizationService.getMyRequests(
      user.tenantId,
      user.employeeId,
      query,
    );
  }

  /**
   * Get pending approvals (Manager/HR/Admin)
   * GET /api/attendance/regularization/pending-approvals
   */
  @Get('pending-approvals')
  @ApiOperation({ summary: 'Get pending regularization approvals' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('attendance:approve')
  async getPendingApprovals(@CurrentUser() user: AuthenticatedUser) {
    return this.regularizationService.getPendingApprovals(
      user.tenantId,
      user.employeeId,
      user.role,
    );
  }

  /**
   * Get all regularization requests (Admin view)
   * GET /api/attendance/regularization/all
   */
  @Get('all')
  @ApiOperation({ summary: 'Get all regularization requests (admin)' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('attendance:read')
  async getAllRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RegularizationQueryDto,
  ) {
    return this.regularizationService.getAllRequests(user.tenantId, query);
  }

  /**
   * Approve a regularization request
   * POST /api/attendance/regularization/:id/approve
   */
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve regularization request' })
  @ApiResponse({ status: 201, description: 'Approved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('attendance:approve')
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveRegularizationDto,
  ) {
    return this.regularizationService.approve(
      user.tenantId,
      id,
      user.employeeId,
      user.role,
      dto,
    );
  }

  /**
   * Reject a regularization request
   * POST /api/attendance/regularization/:id/reject
   */
  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject regularization request' })
  @ApiResponse({ status: 201, description: 'Rejected' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('attendance:approve')
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveRegularizationDto,
  ) {
    return this.regularizationService.reject(
      user.tenantId,
      id,
      user.employeeId,
      user.role,
      dto,
    );
  }
}
