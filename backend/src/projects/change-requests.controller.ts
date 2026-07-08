import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ChangeRequestsService } from './change-requests.service';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { ProposalNoteDto } from './dto/proposal-note.dto';

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER'] as const;

@Controller('projects/:projectId/change-requests')
@UseGuards(AuthGuard('jwt'))
export class ChangeRequestsController {
  constructor(private changeRequestsService: ChangeRequestsService) {}

  @Get()
  findAll(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.changeRequestsService.findAll(projectId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_ROLES)
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: CreateChangeRequestDto,
    @Req() req: any,
  ) {
    return this.changeRequestsService.create(projectId, dto, req.user.id);
  }

  @Post(':id/approve')
  approve(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.changeRequestsService.approve(projectId, id, req.user.roles ?? [], req.user.client?.id, req.user.id);
  }

  @Post(':id/decline')
  decline(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProposalNoteDto,
    @Req() req: any,
  ) {
    return this.changeRequestsService.decline(projectId, id, dto.note, req.user.roles ?? [], req.user.client?.id, req.user.id);
  }

  @Post(':id/request-revision')
  requestRevision(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProposalNoteDto,
    @Req() req: any,
  ) {
    return this.changeRequestsService.requestRevision(projectId, id, dto.note, req.user.roles ?? [], req.user.client?.id, req.user.id);
  }
}
