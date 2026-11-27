import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { DeviceAppAuthGuard } from '../auth/guards/device-app-auth.guard';
import { CardEnrollmentService } from './card-enrollment.service';

class AssignCardDto {
  @IsString()
  cardNumber: string;
}

class PushResultItemDto {
  @IsUUID()
  employeeId: string;

  @IsInt()
  @Min(1)
  deviceUid: number;

  @IsIn(['pushed'])
  status: 'pushed';
}

class PushResultsDto {
  @IsString()
  deviceCode: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PushResultItemDto)
  results: PushResultItemDto[];
}

@ApiTags('attendance-devices')
@ApiBearerAuth()
@Controller('attendance-devices/enrollment')
@UseGuards(DeviceAppAuthGuard, PermissionsGuard)
@RequirePermissions('employees:assign-card')
export class CardEnrollmentQueryController {
  constructor(private readonly cards: CardEnrollmentService) {}

  @Get('departments')
  @ApiOperation({ summary: 'Department tenant untuk filter pendaftaran kartu' })
  listDepartments(@CurrentUser() user: AuthenticatedUser) {
    return this.cards.listDepartments(user.tenantId);
  }

  @Get('employment-types')
  @ApiOperation({ summary: 'Jenis karyawan untuk filter pendaftaran kartu' })
  listEmploymentTypes(@CurrentUser() user: AuthenticatedUser) {
    return this.cards.listEmploymentTypes(user.tenantId);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Karyawan aktif tanpa kartu dan NIK angka' })
  listEmployees(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employmentType') employmentType?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.cards.listUnassigned(
      user.tenantId,
      search,
      departmentId,
      { page, pageSize },
      employmentType,
    );
  }

  @Get('assigned')
  @ApiOperation({ summary: 'Karyawan yang sudah punya kartu' })
  listAssigned(
    @CurrentUser() user: AuthenticatedUser,
    @Query('departmentId') departmentId?: string,
    @Query('search') search?: string,
  ) {
    return this.cards.listAssigned(user.tenantId, departmentId, search);
  }

  @Get('pending-push')
  @ApiOperation({ summary: 'Kartu yang belum ditulis ke mesin' })
  listPending(
    @CurrentUser() user: AuthenticatedUser,
    @Query('departmentId') departmentId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.cards.listPendingPush(user.tenantId, departmentId, search, { page, pageSize });
  }

  @Post('push-results')
  @ApiOperation({ summary: 'Tandai kartu yang sudah tertulis di mesin' })
  markPushed(@CurrentUser() user: AuthenticatedUser, @Body() body: PushResultsDto) {
    return this.cards.markPushResults(user.tenantId, body.deviceCode, body.results);
  }
}

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(DeviceAppAuthGuard, PermissionsGuard)
@RequirePermissions('employees:assign-card')
export class CardEnrollmentCommandController {
  constructor(private readonly cards: CardEnrollmentService) {}

  @Post(':id/card')
  @ApiOperation({ summary: 'Simpan nomor kartu tanpa menulis ke mesin' })
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: AssignCardDto,
  ) {
    return this.cards.assignCard(user.tenantId, id, body.cardNumber);
  }

  @Delete(':id/card')
  @ApiOperation({ summary: 'Cabut kartu. PUSHED butuh deviceCleared=true' })
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('deviceCleared') deviceCleared?: string,
  ) {
    return this.cards.revokeCard(user.tenantId, id, deviceCleared === 'true');
  }
}
