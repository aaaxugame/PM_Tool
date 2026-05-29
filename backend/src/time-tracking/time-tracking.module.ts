import { Module } from '@nestjs/common';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './timesheets.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [TimeEntriesController, TimesheetsController],
  providers: [TimeEntriesService, TimesheetsService, RolesGuard],
  exports: [TimeEntriesService, TimesheetsService],
})
export class TimeTrackingModule {}
