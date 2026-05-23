import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';

@Controller('time-entries')
@UseGuards(AuthGuard('jwt'))
export class TimeEntriesController {
  constructor(private timeEntriesService: TimeEntriesService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('projectId') projectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.timeEntriesService.findAll(req.user.id, {
      projectId: projectId ? Number(projectId) : undefined,
      from,
      to,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.timeEntriesService.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateTimeEntryDto, @Req() req: any) {
    return this.timeEntriesService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTimeEntryDto, @Req() req: any) {
    return this.timeEntriesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.timeEntriesService.remove(id, req.user.id);
  }
}
