import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../../common/guards/permissions.guard";
import { AuthenticatedUser } from "../../../common/types/jwt-payload.type";
import { DeviceAppAuthGuard } from "../../auth/guards/device-app-auth.guard";
import { AttendanceDeskService } from "./attendance-desk.service";
import { DeviceDirectorySyncService } from "./device-directory-sync.service";
import { DevicePushFeed } from "./device-push-feed";

class SaveAttendanceDeviceDto {
  @IsString()
  code: string;

  @IsString()
  serialNumber: string;

  @IsString()
  host: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  webPort: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  softwarePort: number;

  @IsOptional()
  @IsString()
  firmware?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  deviceNumber?: number;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class RemoveDirectoryUserDto {
  @IsString()
  nik: string;

  @IsOptional()
  @IsBoolean()
  devicesCleared?: boolean;
}

class SyncDirectoryDto {
  @IsString()
  nik: string;
}

class FacePhotoDto {
  @IsString()
  nik: string;

  @IsString()
  @MaxLength(180_000)
  record: string;
}

class DirectoryImportUserDto {
  @IsString()
  nik: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  card?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  face?: number;
}

class DirectoryImportDeviceDto {
  @IsString()
  deviceCode: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DirectoryImportUserDto)
  users: DirectoryImportUserDto[];
}

class DirectoryImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DirectoryImportDeviceDto)
  devices: DirectoryImportDeviceDto[];
}

class DirectoryNameChangeDto {
  @IsString()
  deviceCode: string;

  @IsString()
  nik: string;

  @IsString()
  @MaxLength(24)
  name: string;
}

class DirectoryNameDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DirectoryNameChangeDto)
  names: DirectoryNameChangeDto[];
}

@ApiTags("attendance-devices")
@ApiBearerAuth()
@Controller()
@UseGuards(DeviceAppAuthGuard, PermissionsGuard)
@RequirePermissions("employees:assign-card")
export class AttendanceDeskController {
  constructor(
    private readonly desk: AttendanceDeskService,
    private readonly directorySync: DeviceDirectorySyncService,
    private readonly pushFeed: DevicePushFeed,
  ) {}

  @Get("attendance-devices/push-feed")
  pushFeedEvents(@CurrentUser() user: AuthenticatedUser) {
    return { events: this.pushFeed.list(user.tenantId) };
  }

  @Get("attendance-devices/directory")
  directory(
    @CurrentUser() user: AuthenticatedUser,
    @Query("search") search?: string,
    @Query("departmentId") departmentId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("missingFace") missingFace?: string,
    @Query("missingFinger") missingFinger?: string,
    @Query("differs") differs?: string,
    @Query("probe") probe?: string,
  ) {
    return this.directorySync.directory(user.tenantId, {
      search,
      departmentId,
      page,
      pageSize,
      missingFace,
      missingFinger,
      differs,
      probe,
    });
  }

  @Post("attendance-devices/directory/remove")
  removeDirectoryUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RemoveDirectoryUserDto,
  ) {
    return this.directorySync.removeOne(
      user.tenantId,
      body.nik,
      body.devicesCleared === true,
    );
  }

  @Post("attendance-devices/directory/sync")
  syncDirectory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SyncDirectoryDto,
  ) {
    return this.directorySync.syncRow(user.tenantId, body.nik);
  }

  @Post("attendance-devices/directory/faces")
  importFace(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: FacePhotoDto,
  ) {
    return this.directorySync.importFacePhoto(
      user.tenantId,
      body.nik,
      body.record,
    );
  }

  @Post("attendance-devices/directory/import")
  importDirectory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: DirectoryImportDto,
  ) {
    return this.directorySync.importDeviceUsers(user.tenantId, body.devices);
  }

  @Post("attendance-devices/directory/names")
  renameDirectory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: DirectoryNameDto,
  ) {
    return this.directorySync.renameDirectoryUsers(user.tenantId, body.names);
  }

  @Get("attendance-devices/enrollment/summary")
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query("departmentId") departmentId?: string,
  ) {
    return this.desk.summary(user.tenantId, departmentId);
  }

  @Get("attendance/punches")
  punches(
    @CurrentUser() user: AuthenticatedUser,
    @Query("date") date?: string,
    @Query("recent") recent?: string,
    @Query("departmentId") departmentId?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.desk.punches(user.tenantId, {
      date,
      recent,
      departmentId,
      search,
      page,
      pageSize,
    });
  }

  @Get("attendance-devices")
  devices(@CurrentUser() user: AuthenticatedUser) {
    return this.desk.devices(user.tenantId);
  }

  @Post("attendance-devices")
  createDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SaveAttendanceDeviceDto,
  ) {
    return this.desk.createDevice(user.tenantId, body);
  }

  @Put("attendance-devices/:id")
  updateDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: SaveAttendanceDeviceDto,
  ) {
    return this.desk.updateDevice(user.tenantId, id, body);
  }

  @Delete("attendance-devices/:id")
  deleteDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.desk.deleteDevice(user.tenantId, id);
  }

  @Get("attendance-devices/:id/credentials")
  credentials(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.desk.credentials(user.tenantId, id);
  }
}
