import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TimesheetsService } from './timesheets.service';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';

@Controller('timesheets')
@UseGuards(AuthGuard('jwt'))
export class TimesheetsController {
  constructor(private timesheetsService: TimesheetsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.timesheetsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.timesheetsService.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateTimesheetDto, @Req() req: any) {
    return this.timesheetsService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTimesheetDto, @Req() req: any) {
    return this.timesheetsService.update(id, dto, req.user.id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.timesheetsService.remove(id, req.user.id);
  }
}
