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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';

@ApiTags('departments')
@ApiBearerAuth()
@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(private departmentsService: DepartmentsService) {}

  /**
   * Create a new department
   * POST /api/departments
   */
  @Post()
  @ApiOperation({ summary: 'Create department' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('departments:create')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(user.tenantId, dto);
  }

  /**
   * Get all departments
   * GET /api/departments
   */
  @Get()
  @ApiOperation({ summary: 'Get all departments' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermissions('departments:read')
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.departmentsService.findAll(user.tenantId);
  }

  /**
   * Get department hierarchy
   * GET /api/departments/hierarchy
   */
  @Get('hierarchy')
  @ApiOperation({ summary: 'Get department hierarchy' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermissions('departments:read')
  async getHierarchy(@CurrentUser() user: AuthenticatedUser) {
    return this.departmentsService.getHierarchy(user.tenantId);
  }

  /**
   * Get department by ID
   * GET /api/departments/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('departments:read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.departmentsService.findOne(user.tenantId, id);
  }

  /**
   * Update department
   * PUT /api/departments/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update department' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('departments:update')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(user.tenantId, id, dto);
  }

  /**
   * Delete department
   * DELETE /api/departments/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete department' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('departments:delete')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.departmentsService.remove(user.tenantId, id);
  }
}
