import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER'] as const;

@Controller('projects/:projectId/milestones')
@UseGuards(AuthGuard('jwt'))
export class MilestonesController {
  constructor(private milestonesService: MilestonesService) {}

  @Get()
  findAll(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.milestonesService.findAll(projectId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_ROLES)
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestonesService.create(projectId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_ROLES)
  update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(projectId, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_ROLES)
  remove(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.milestonesService.remove(projectId, id);
  }
}
