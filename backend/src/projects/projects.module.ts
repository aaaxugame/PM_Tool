import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';
@Module({
  imports: [],
  controllers: [ProjectsController, MilestonesController],
  providers: [ProjectsService, MilestonesService],
  exports: [ProjectsService, MilestonesService],
})
export class ProjectsModule {}
