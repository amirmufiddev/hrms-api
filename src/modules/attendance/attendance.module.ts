import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { OtCalculationService } from './ot-calculation.service';
import { RegularizationController } from './regularization.controller';
import { RegularizationService } from './regularization.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReportsModule } from '../reports/reports.module';
import { PunchIngestController } from './punch-ingest.controller';
import { PunchIngestService } from './punch-ingest.service';
import { PunchQueueService } from './punch-queue.service';
import { PunchQueueWorker } from './punch-queue.worker';
import { DeviceLogClient } from './device/device-log-client';
import { DeviceLogPullService } from './device-log-pull.service';
import { DevicePushFeed } from './device/device-push-feed';
import { DevicePushIngestService } from './device/device-push-ingest.service';
import { DevicePushListener } from './device/device-push.listener';
import { DevicePushSession } from './device/device-push.session';
import { DeviceCommandGate } from './device/device-command-gate';
import { DevicePace } from './device/device-pace';
import { DeviceDirectoryClient } from './device/device-directory.client';
import { DeviceDirectorySyncService } from './device/device-directory-sync.service';

@Module({
  imports: [NotificationsModule, ReportsModule],
  controllers: [AttendanceController, RegularizationController, PunchIngestController],
  providers: [
    AttendanceService,
    OtCalculationService,
    RegularizationService,
    PunchIngestService,
    PunchQueueService,
    PunchQueueWorker,
    DeviceLogClient,
    DeviceLogPullService,
    DevicePushFeed,
    DevicePushIngestService,
    DevicePushSession,
    DevicePushListener,
    DeviceCommandGate,
    DevicePace,
    DeviceDirectoryClient,
    DeviceDirectorySyncService,
  ],
  exports: [
    AttendanceService,
    OtCalculationService,
    RegularizationService,
    PunchIngestService,
    PunchQueueService,
    DeviceLogPullService,
    DeviceDirectorySyncService,
    DevicePushFeed,
  ],
})
export class AttendanceModule {}
