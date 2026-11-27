import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PunchVerifyMode } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { DeviceAppAuthGuard } from '../auth/guards/device-app-auth.guard';
import { IngestPunchInput, PunchIngestService } from './punch-ingest.service';
import { PunchQueueService } from './punch-queue.service';

class IngestPunchDto implements IngestPunchInput {
  @IsString()
  nik: string;

  @IsString()
  punchedAt: string;

  @IsOptional()
  @IsEnum(PunchVerifyMode)
  verifyMode?: PunchVerifyMode;

  @IsOptional()
  @IsInt()
  deviceState?: number | null;
}

class IngestPunchesDto {
  @IsString()
  deviceCode: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => IngestPunchDto)
  punches: IngestPunchDto[];
}

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(DeviceAppAuthGuard, PermissionsGuard)
export class PunchIngestController {
  constructor(
    private readonly punches: PunchIngestService,
    private readonly queue: PunchQueueService,
  ) {}

  @Post('punches')
  @RequirePermissions('attendance:ingest', 'employees:assign-card')
  @ApiOperation({ summary: 'Terima batch tap mesin absen' })
  async ingest(@CurrentUser() user: AuthenticatedUser, @Body() body: IngestPunchesDto) {
    const result = await this.punches.ingest(user.tenantId, body);
    if (result.results.some((row) => row.status === 'queued')) {
      void this.queue.processOnce().catch(() => undefined);
    }
    return result;
  }
}
