import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AttendanceModule } from '../attendance/attendance.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { CardEnrollmentService } from './card-enrollment.service';
import {
  CardEnrollmentCommandController,
  CardEnrollmentQueryController,
} from './card-enrollment.controller';
import { AttendanceDeskController } from '../attendance/device/attendance-desk.controller';
import { AttendanceDeskService } from '../attendance/device/attendance-desk.service';
import { EmployeeImportController } from './import/employee-import.controller';
import { EmployeeImportService } from './import/employee-import.service';
import { EmployeeImportProcessor } from './import/employee-import.processor';

const redisEnabled = process.env.REDIS_ENABLED === 'true';

@Module({
  imports: [
    AttendanceModule,
    ...(redisEnabled
      ? [BullModule.registerQueue({ name: 'employee-import' })]
      : []),
  ],
  controllers: [
    EmployeesController,
    ...(redisEnabled ? [EmployeeImportController] : []),
    CardEnrollmentQueryController,
    CardEnrollmentCommandController,
    AttendanceDeskController,
  ],
  providers: [
    EmployeesService,
    CardEnrollmentService,
    AttendanceDeskService,
    EmployeeImportService,
    ...(redisEnabled ? [EmployeeImportProcessor] : []),
  ],
  exports: [EmployeesService, CardEnrollmentService],
})
export class EmployeesModule {}
