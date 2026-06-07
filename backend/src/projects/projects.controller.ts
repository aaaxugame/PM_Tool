import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from '@prisma/client';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get('mine')
  findMine(@Req() req: any) {
    return this.projectsService.findMine(req.user.id);
  }

  @Get('vendor')
  findForVendor(@Req() req: any, @Query('archived') archived?: string) {
    const vendorId = req.user.vendor?.id;
    if (!vendorId) throw new ForbiddenException('Not a vendor user');
    return this.projectsService.findForVendor(vendorId, archived === 'true');
  }

  @Get('vendor/requests')
  findVendorRequests(@Req() req: any) {
    const vendorId = req.user.vendor?.id;
    if (!vendorId) throw new ForbiddenException('Not a vendor user');
    return this.projectsService.findVendorRequests(vendorId);
  }

  @Get('pending-requests')
  findPendingVendorRequests() {
    return this.projectsService.findPendingVendorRequests();
  }

  @Get('client')
  findForClient(@Req() req: any) {
    const clientId = req.user.client?.id;
    if (!clientId) throw new ForbiddenException('Not a client user');
    return this.projectsService.findForClient(clientId);
  }

  @Get()
  findAll(
    @Query('status') status?: ProjectStatus,
    @Query('pmId') pmId?: string,
    @Query('amId') amId?: string,
    @Query('clientId') clientId?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.projectsService.findAll({
      status,
      pmId: pmId ? parseInt(pmId, 10) : undefined,
      amId: amId ? parseInt(amId, 10) : undefined,
      clientId: clientId ? parseInt(clientId, 10) : undefined,
      vendorId: vendorId ? parseInt(vendorId, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProjectDto, @Req() req: any) {
    return this.projectsService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto, @Req() req: any) {
    return this.projectsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.remove(id);
  }
}
