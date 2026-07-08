import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { MANAGER_ROLES } from './projects.service';

const CR_INCLUDE = {
  requestedBy: { select: { id: true, name: true } },
  respondedBy: { select: { id: true, name: true } },
  createdMilestones: true,
};

@Injectable()
export class ChangeRequestsService {
  constructor(private prisma: PrismaService) {}

  findAll(projectId: number) {
    return this.prisma.changeRequest.findMany({
      where: { projectId },
      orderBy: { sentAt: 'desc' },
      include: CR_INCLUDE,
    });
  }

  private async findOneWithProject(projectId: number, id: number) {
    const cr = await this.prisma.changeRequest.findFirst({
      where: { id, projectId },
      include: { ...CR_INCLUDE, project: { select: { clientId: true } } },
    });
    if (!cr) throw new NotFoundException(`Change request ${id} not found`);
    return cr;
  }

  async create(projectId: number, dto: CreateChangeRequestDto, userId: number) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    if (!project.clientId) {
      throw new BadRequestException('This project has no client — change requests only apply to client-facing projects');
    }
    if ((project as any).proposalStatus !== 'APPROVED') {
      throw new BadRequestException('The proposal must be approved before raising a change request');
    }

    return this.prisma.changeRequest.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        costDelta: dto.costDelta,
        milestones: (dto.milestones ?? []) as any,
        supersedesId: dto.supersedesId,
        status: 'SENT',
        requestedById: userId,
      },
      include: CR_INCLUDE,
    });
  }

  private assertAuthorized(cr: { project: { clientId: number | null } }, userRoles: string[], userClientId: number | undefined) {
    const isInternalApprover = userRoles.some(r => MANAGER_ROLES.includes(r));
    const isMatchingClient = userRoles.includes('CLIENT') && userClientId === cr.project.clientId;
    if (!isInternalApprover && !isMatchingClient) {
      throw new ForbiddenException('Not authorized to respond to this change request');
    }
  }

  async approve(projectId: number, id: number, userRoles: string[], userClientId: number | undefined, userId: number) {
    const cr = await this.findOneWithProject(projectId, id);
    this.assertAuthorized(cr, userRoles, userClientId);
    if (cr.status !== 'SENT') {
      throw new BadRequestException(`Cannot approve change request in ${cr.status} status`);
    }

    const milestones = (cr.milestones as any[]) ?? [];
    const [updated] = await this.prisma.$transaction([
      this.prisma.changeRequest.update({
        where: { id },
        data: { status: 'APPROVED', respondedAt: new Date(), respondedById: userId },
        include: CR_INCLUDE,
      }),
      ...milestones.map(m =>
        this.prisma.milestone.create({
          data: {
            projectId,
            changeRequestId: id,
            name: m.name,
            description: m.description ?? null,
            dueDate: m.dueDate ? new Date(m.dueDate) : null,
            amount: m.amount ?? null,
          },
        }),
      ),
      this.prisma.project.update({
        where: { id: projectId },
        data: { proposedCost: { increment: cr.costDelta } },
      }),
    ]);
    return updated;
  }

  async decline(projectId: number, id: number, note: string, userRoles: string[], userClientId: number | undefined, userId: number) {
    if (!note?.trim()) throw new BadRequestException('A decline reason is required');
    const cr = await this.findOneWithProject(projectId, id);
    this.assertAuthorized(cr, userRoles, userClientId);
    if (cr.status !== 'SENT') {
      throw new BadRequestException(`Cannot decline change request in ${cr.status} status`);
    }
    return this.prisma.changeRequest.update({
      where: { id },
      data: { status: 'DECLINED', respondedAt: new Date(), respondedById: userId, responseNote: note },
      include: CR_INCLUDE,
    });
  }

  async requestRevision(projectId: number, id: number, note: string, userRoles: string[], userClientId: number | undefined, userId: number) {
    if (!note?.trim()) throw new BadRequestException('Revision instructions are required');
    const cr = await this.findOneWithProject(projectId, id);
    this.assertAuthorized(cr, userRoles, userClientId);
    if (cr.status !== 'SENT') {
      throw new BadRequestException(`Cannot request revision on change request in ${cr.status} status`);
    }
    return this.prisma.changeRequest.update({
      where: { id },
      data: { status: 'REVISION_REQUESTED', respondedAt: new Date(), respondedById: userId, responseNote: note },
      include: CR_INCLUDE,
    });
  }
}
