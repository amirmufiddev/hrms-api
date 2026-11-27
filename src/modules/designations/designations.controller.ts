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
import { DesignationsService } from './designations.service';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/designation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';

@ApiTags('designations')
@ApiBearerAuth()
@Controller('designations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DesignationsController {
  constructor(private designationsService: DesignationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new designation' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('positions:create')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDesignationDto,
  ) {
    return this.designationsService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all designations (auto-synced from SSO)' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermissions('positions:read')
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.designationsService.findAll(user.tenantId);
  }

  @Post('sync-from-sso')
  @ApiOperation({ summary: 'Sync departments and positions from SSO' })
  @ApiResponse({ status: 200, description: 'Synced' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermissions('positions:update', 'admin:read')
  async syncFromSso(@CurrentUser() user: AuthenticatedUser) {
    return this.designationsService.syncOrgFromSso(user.tenantId);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get designation / position hierarchy tree' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermissions('positions:read')
  async getTree(@CurrentUser() user: AuthenticatedUser) {
    return this.designationsService.getTree(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get designation by ID' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('positions:read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.designationsService.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update designation' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('positions:update')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDesignationDto,
  ) {
    return this.designationsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete designation' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('positions:delete')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.designationsService.remove(user.tenantId, id);
  }
}
