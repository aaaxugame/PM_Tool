import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { TimesheetsService } from './timesheets.service';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('timesheets')
@UseGuards(AuthGuard('jwt'))
export class TimesheetsController {
  constructor(private timesheetsService: TimesheetsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.timesheetsService.findAll(req.user.id);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER')
  findPending() {
    return this.timesheetsService.findAllSubmitted();
  }

  @Get('approved')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER')
  findApproved() {
    return this.timesheetsService.findAllApproved();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const isReviewer = req.user.roles?.some((r: string) =>
      ['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER'].includes(r)
    );
    if (isReviewer) return this.timesheetsService.findOneAsReviewer(id);
    return this.timesheetsService.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateTimesheetDto, @Req() req: any) {
    return this.timesheetsService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTimesheetDto, @Req() req: any) {
    return this.timesheetsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.timesheetsService.remove(id, req.user.id);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER')
  approve(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.timesheetsService.approve(id, req.user.id);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('rejectionReason') rejectionReason: string,
    @Req() req: any,
  ) {
    return this.timesheetsService.reject(id, req.user.id, rejectionReason);
  }
}
