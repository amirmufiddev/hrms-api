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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto } from './dto/employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  /**
   * Create a new employee
   * POST /api/employees
   */
  @Post()
  @ApiOperation({ summary: 'Create new employee' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('employees:create')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(user.tenantId, dto);
  }

  /**
   * Get all employees with pagination and filters
   * GET /api/employees
   */
  @Get()
  @ApiOperation({ summary: 'Get all employees' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermissions('employees:read')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: EmployeeQueryDto,
  ) {
    return this.employeesService.findAll(user.tenantId, query);
  }

  @Get('next-employee-code')
  @ApiOperation({ summary: 'Generate next employee code (9-prefix)' })
  @RequirePermissions('employees:create')
  async getNextEmployeeCode(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.getNextEmployeeCode(user.tenantId);
  }

  /**
   * Get org chart tree structure
   * GET /api/employees/org-chart
   */
  @Get('org-chart')
  @ApiOperation({ summary: 'Get organization chart tree' })
  @ApiResponse({ status: 200, description: 'Success' })
  @RequirePermissions('employees:read')
  async getOrgChart(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.getOrgChart(user.tenantId);
  }

  /**
   * Get employee by ID
   * GET /api/employees/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('employees:read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.employeesService.findOne(user.tenantId, id);
  }

  /**
   * Get Employee 360 view
   * GET /api/employees/:id/360
   */
  @Get(':id/360')
  @ApiOperation({ summary: 'Get employee 360 view' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('employees:read')
  async get360View(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.employeesService.get360View(user.tenantId, id);
  }

  /**
   * Get direct reports for a manager
   * GET /api/employees/:id/direct-reports
   */
  @Get(':id/direct-reports')
  @ApiOperation({ summary: 'Get direct reports' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('employees:read')
  async getDirectReports(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.employeesService.getDirectReports(user.tenantId, id);
  }

  /**
   * Create an SSO account for an existing local employee
   * POST /api/employees/:id/sso-account
   */
  @Post(':id/sso-account')
  @ApiOperation({ summary: 'Create SSO account for an existing employee' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 409, description: 'SSO account already exists' })
  @RequirePermissions('employees:update')
  async createSsoAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.employeesService.createSsoAccount(user.tenantId, id);
  }

  /**
   * Update employee
   * PUT /api/employees/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update employee' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('employees:update')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(user.tenantId, id, dto);
  }

  /**
   * Delete employee
   * DELETE /api/employees/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete employee' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('employees:delete')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.employeesService.remove(user.tenantId, id);
  }
}
