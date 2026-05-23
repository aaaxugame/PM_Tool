import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus, Priority } from '@prisma/client';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('milestoneId') milestoneId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: Priority,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.tasksService.findAll({
      projectId: projectId ? Number(projectId) : undefined,
      milestoneId: milestoneId ? Number(milestoneId) : undefined,
      status,
      priority,
      assigneeId: assigneeId ? Number(assigneeId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @Req() req: any) {
    return this.tasksService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id);
  }
}
