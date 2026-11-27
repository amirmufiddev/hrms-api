import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ExitService } from './exit.service';
import {
  InitiateSeparationDto,
  UpdateSeparationDto,
  SeparationQueryDto,
} from './dto/exit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';

@ApiTags('exit')
@ApiBearerAuth()
@Controller('exit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExitController {
  constructor(private exitService: ExitService) {}

  @Post('separations')
  @RequirePermissions('exit:manage')
  @ApiOperation({ summary: 'Initiate employee separation' })
  @ApiResponse({ status: 201, description: 'Separation initiated' })
  async initiate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InitiateSeparationDto,
  ) {
    return this.exitService.initiate(user.tenantId, user.userId, dto);
  }

  @Get('separations')
  @RequirePermissions('exit:read')
  @ApiOperation({ summary: 'List all separations' })
  @ApiResponse({ status: 200, description: 'Success' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SeparationQueryDto,
  ) {
    return this.exitService.findAll(user.tenantId, query);
  }

  @Get('separations/:id')
  @RequirePermissions('exit:read')
  @ApiOperation({ summary: 'Get separation by ID' })
  @ApiResponse({ status: 200, description: 'Success' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.exitService.findOne(user.tenantId, id);
  }

  @Put('separations/:id')
  @RequirePermissions('exit:manage')
  @ApiOperation({ summary: 'Update separation details' })
  @ApiResponse({ status: 200, description: 'Updated' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSeparationDto,
  ) {
    return this.exitService.update(user.tenantId, id, dto);
  }

  @Post('separations/:id/notice-period')
  @RequirePermissions('exit:manage')
  @ApiOperation({ summary: 'Move to notice period' })
  @ApiResponse({ status: 200, description: 'Moved to notice period' })
  async moveToNoticePeriod(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.exitService.moveToNoticePeriod(user.tenantId, id);
  }

  @Post('separations/:id/clearance')
  @RequirePermissions('exit:manage')
  @ApiOperation({ summary: 'Move to clearance pending' })
  @ApiResponse({ status: 200, description: 'Moved to clearance' })
  async moveToClearance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.exitService.moveToClearance(user.tenantId, id);
  }

  @Post('separations/:id/complete')
  @RequirePermissions('exit:manage')
  @ApiOperation({ summary: 'Complete separation (marks employee inactive)' })
  @ApiResponse({ status: 200, description: 'Completed' })
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.exitService.complete(user.tenantId, id);
  }

  @Post('separations/:id/cancel')
  @RequirePermissions('exit:manage')
  @ApiOperation({ summary: 'Cancel separation' })
  @ApiResponse({ status: 200, description: 'Cancelled' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.exitService.cancel(user.tenantId, id);
  }
}
