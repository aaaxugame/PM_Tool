import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

@Controller('projects/:projectId/milestones')
@UseGuards(AuthGuard('jwt'))
export class MilestonesController {
  constructor(private milestonesService: MilestonesService) {}

  @Get()
  findAll(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.milestonesService.findAll(projectId);
  }

  @Post()
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestonesService.create(projectId, dto);
  }

  @Patch(':id')
  update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(projectId, id, dto);
  }

  @Delete(':id')
  remove(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.milestonesService.remove(projectId, id);
  }
}
