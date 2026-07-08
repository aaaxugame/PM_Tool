import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';
import { ChangeRequestsController } from './change-requests.controller';
import { ChangeRequestsService } from './change-requests.service';
@Module({
  imports: [],
  controllers: [ProjectsController, MilestonesController, ChangeRequestsController],
  providers: [ProjectsService, MilestonesService, ChangeRequestsService],
  exports: [ProjectsService, MilestonesService, ChangeRequestsService],
})
export class ProjectsModule {}
