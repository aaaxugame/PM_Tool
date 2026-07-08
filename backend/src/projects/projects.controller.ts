import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProposalNoteDto } from './dto/proposal-note.dto';
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
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.projectsService.findOne(id, req.user);
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
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.remove(id);
  }

  @Get(':id/members')
  listMembers(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.listMembers(id);
  }

  @Get(':id/assignable-users')
  listAssignableUsers(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.listAssignableUsers(id);
  }


  @Post(':id/members')
  addMember(@Param('id', ParseIntPipe) id: number, @Body('userId', ParseIntPipe) userId: number) {
    return this.projectsService.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.projectsService.removeMember(id, userId);
  }

  // ── Client Proposal workflow ──────────────────────────────────────────────

  @Post(':id/proposal/send')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER')
  sendProposal(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.projectsService.sendProposal(id, req.user.id);
  }

  @Post(':id/proposal/approve')
  approveProposal(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.projectsService.approveProposal(id, req.user.roles ?? [], req.user.client?.id, req.user.id);
  }

  @Post(':id/proposal/decline')
  declineProposal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProposalNoteDto,
    @Req() req: any,
  ) {
    return this.projectsService.declineProposal(id, dto.note, req.user.roles ?? [], req.user.client?.id, req.user.id);
  }

  @Post(':id/proposal/request-revision')
  requestProposalRevision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProposalNoteDto,
    @Req() req: any,
  ) {
    return this.projectsService.requestProposalRevision(id, dto.note, req.user.roles ?? [], req.user.client?.id, req.user.id);
  }

  @Post(':id/proposal/revise')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER')
  reviseProposal(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.reviseProposal(id);
  }
}
