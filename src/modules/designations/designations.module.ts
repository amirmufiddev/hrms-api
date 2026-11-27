import { Module } from '@nestjs/common';
import { DepartmentsModule } from '../departments/departments.module';
import { DesignationsController } from './designations.controller';
import { DesignationsService } from './designations.service';

@Module({
  imports: [DepartmentsModule],
  controllers: [DesignationsController],
  providers: [DesignationsService],
  exports: [DesignationsService],
})
export class DesignationsModule {}
