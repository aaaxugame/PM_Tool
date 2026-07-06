import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from '@prisma/client';

export interface RequestUser {
  id: number;
  roles: string[];
  client: { id: number } | null;
}

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER'];

const PROPOSAL_TRANSITIONS: Partial<Record<string, string[]>> = {
  DRAFT:               ['SENT'],
  SENT:                ['APPROVED', 'DECLINED', 'REVISION_REQUESTED'],
  APPROVED:            ['DRAFT'],
  DECLINED:            ['DRAFT'],
  REVISION_REQUESTED:  ['DRAFT'],
};

const LOCKED_PROPOSAL_FIELDS = ['hourlyRate', 'proposedCost', 'billingMethod', 'estimatedHours'];

const PROJECT_INCLUDE = {
  client: { select: { id: true, name: true, currency: true } },
  createdBy: { select: { id: true, name: true } },
  requestingVendor: { select: { id: true, name: true } },
  assignedVendor: { select: { id: true, name: true } },
  assignments: {
    include: { user: { select: { id: true, name: true } } },
  },
  tasks: {
    where: { status: 'DONE' as any },
    select: { id: true },
  },
  _count: { select: { milestones: true, tasks: true } },
};

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  findAll(filters: {
    status?: ProjectStatus;
    pmId?: number;
    amId?: number;
    clientId?: number;
    vendorId?: number;
  } = {}) {
    const where: any = {};
    const andConditions: any[] = [];

    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { not: ProjectStatus.ARCHIVED };
    }

    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.vendorId) {
      andConditions.push({
        OR: [
          { requestingVendorId: filters.vendorId },
          { assignedVendorId: filters.vendorId },
          { vendorQuotes: { some: { vendorId: filters.vendorId } } },
        ],
      });
    }
    if (filters.pmId) {
      andConditions.push({ assignments: { some: { userId: filters.pmId, assignmentRole: 'PROJECT_MANAGER' } } });
    }
    if (filters.amId) {
      andConditions.push({ assignments: { some: { userId: filters.amId, assignmentRole: 'ACCOUNT_MANAGER' } } });
    }
    if (andConditions.length) where.AND = andConditions;

    return this.prisma.project.findMany({
      where,
      include: PROJECT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findMine(userId: number) {
    return this.prisma.project.findMany({
      where: {
        OR: [
          { assignments: { some: { userId } } },
          { members: { some: { userId } } },
        ],
        status: { not: ProjectStatus.ARCHIVED },
      },
      include: PROJECT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findForVendor(vendorId: number, archived: boolean) {
    return this.prisma.project.findMany({
      where: {
        OR: [
          { vendorQuotes: { some: { vendorId } } },
          { requestingVendorId: vendorId },
        ],
        approvalStatus: 'APPROVED',
        status: archived ? ProjectStatus.ARCHIVED : { not: ProjectStatus.ARCHIVED },
      },
      include: PROJECT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findVendorRequests(vendorId: number) {
    return this.prisma.project.findMany({
      where: {
        requestingVendorId: vendorId,
        approvalStatus: { not: 'APPROVED' },
        status: { not: ProjectStatus.ARCHIVED },
      },
      include: PROJECT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findPendingVendorRequests() {
    return this.prisma.project.findMany({
      where: {
        requestingVendorId: { not: null },
        approvalStatus: 'PENDING',
      },
      include: PROJECT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findForClient(clientId: number) {
    return this.prisma.project.findMany({
      where: { clientId },
      include: PROJECT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, user?: RequestUser) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, currency: true } },
        createdBy: { select: { id: true, name: true } },
        requestingVendor: { select: { id: true, name: true } },
        assignedVendor: { select: { id: true, name: true } },
        assignments: { include: { user: { select: { id: true, name: true } } } },
        members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } },
        milestones: { orderBy: { dueDate: 'asc' } },
        _count: { select: { tasks: true, timeEntries: true } },
      },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    if (user) this.assertClientCanAccessProject(user, project);
    return project;
  }

  private assertClientCanAccessProject(user: RequestUser, project: { clientId: number | null }) {
    if (!user.roles.includes('CLIENT')) return;
    if (!user.client || project.clientId !== user.client.id) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  async create(dto: CreateProjectDto, userId: number) {
    const { startDate, endDate, pmId, amId, clientId, ...rest } = dto;

    const assignmentData: any[] = [];
    if (pmId) assignmentData.push({ userId: pmId, assignmentRole: 'PROJECT_MANAGER', assignedById: userId });
    if (amId) assignmentData.push({ userId: amId, assignmentRole: 'ACCOUNT_MANAGER', assignedById: userId });

    return this.prisma.project.create({
      data: {
        ...rest,
        clientId: clientId ?? null,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        createdById: userId,
        ...(assignmentData.length ? { assignments: { create: assignmentData } } : {}),
      } as any,
      include: PROJECT_INCLUDE,
    });
  }

  async update(id: number, dto: UpdateProjectDto, userId: number) {
    const existing = await this.findOne(id);
    const { startDate, endDate, pmId, amId, projectType, ...rest } = dto as any;

    // Lock requestingVendorId once set — cannot be overwritten via update
    if (existing.requestingVendorId) {
      delete rest.requestingVendorId;
    }

    // Lock billing terms once the client has approved the proposal
    if ((existing as any).proposalStatus === 'APPROVED' && existing.clientId) {
      const touchesLockedField = LOCKED_PROPOSAL_FIELDS.some(f => rest[f] !== undefined);
      if (touchesLockedField) {
        throw new BadRequestException(
          'Cannot change billing terms on an approved proposal. Start a new proposal revision first.',
        );
      }
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      include: PROJECT_INCLUDE,
    });

    // Replace PM assignment if provided
    if (pmId !== undefined) {
      await this.prisma.projectAssignment.deleteMany({ where: { projectId: id, assignmentRole: 'PROJECT_MANAGER' } });
      if (pmId) {
        await this.prisma.projectAssignment.create({
          data: { projectId: id, userId: pmId, assignmentRole: 'PROJECT_MANAGER', assignedById: userId },
        });
      }
    }

    // Replace AM assignment if provided
    if (amId !== undefined) {
      await this.prisma.projectAssignment.deleteMany({ where: { projectId: id, assignmentRole: 'ACCOUNT_MANAGER' } });
      if (amId) {
        await this.prisma.projectAssignment.create({
          data: { projectId: id, userId: amId, assignmentRole: 'ACCOUNT_MANAGER', assignedById: userId },
        });
      }
    }

    return project;
  }

  listMembers(projectId: number) {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(projectId: number, userId: number) {
    await this.findOne(projectId);
    return this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: {},
      create: { projectId, userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async removeMember(projectId: number, userId: number) {
    await this.prisma.projectMember.deleteMany({ where: { projectId, userId } });
  }

  async listAssignableUsers(projectId: number) {
    const project = await this.findOne(projectId);
    const users = new Map<number, { id: number; name: string; email: string }>();

    const assignments = await this.prisma.projectAssignment.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    assignments.forEach(a => users.set(a.user.id, a.user));

    const members = await this.listMembers(projectId);
    members.forEach(m => users.set(m.user.id, m.user));

    if (project.assignedVendorId) {
      const vendorUsers = await this.prisma.user.findMany({
        where: { vendorId: project.assignedVendorId },
        select: { id: true, name: true, email: true },
      });
      vendorUsers.forEach(u => users.set(u.id, u));
    }

    return Array.from(users.values());
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.timeEntry.deleteMany({ where: { projectId: id } }),
      this.prisma.invoiceLineItem.deleteMany({ where: { invoice: { projectId: id } } }),
      this.prisma.invoice.deleteMany({ where: { projectId: id } }),
      this.prisma.vendorQuote.deleteMany({ where: { projectId: id } }),
      this.prisma.budget.deleteMany({ where: { projectId: id } }),
      this.prisma.billingRate.deleteMany({ where: { projectId: id } }),
      this.prisma.document.deleteMany({ where: { projectId: id } }),
      this.prisma.task.deleteMany({ where: { projectId: id } }),
      this.prisma.milestone.deleteMany({ where: { projectId: id } }),
      this.prisma.project.delete({ where: { id } }),
    ]);
  }

  // ── Client Proposal workflow ──────────────────────────────────────────────

  async sendProposal(id: number) {
    const project = await this.findOne(id);
    if (!project.clientId) {
      throw new BadRequestException('This project has no client — the proposal workflow only applies to client-facing projects');
    }
    const allowed = PROPOSAL_TRANSITIONS[(project as any).proposalStatus] ?? [];
    if (!allowed.includes('SENT')) {
      throw new BadRequestException(`Cannot send proposal from ${(project as any).proposalStatus} status`);
    }
    if ((project.billingMethod === 'TIME_AND_MATERIALS' || project.billingMethod === 'MIXED') && !project.hourlyRate) {
      throw new BadRequestException(
        'An hourly rate is required before sending a proposal for Time and Materials or Mixed billing.',
      );
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: { proposalStatus: 'SENT', proposalSentAt: new Date() } as any,
      include: PROJECT_INCLUDE,
    });

    const client = await this.prisma.client.findUnique({
      where: { id: project.clientId! },
      select: { name: true, contactEmail: true, currency: true },
    });
    if (client?.contactEmail) {
      this.mail.sendProposalSent({
        toEmail: client.contactEmail,
        toName: client.name,
        projectId: id,
        projectName: updated.name,
        proposalVersion: (updated as any).proposalVersion,
        billingMethod: updated.billingMethod,
        proposedCost: updated.proposedCost ? Number(updated.proposedCost).toFixed(2) : null,
        hourlyRate: updated.hourlyRate ? Number(updated.hourlyRate).toFixed(2) : null,
        currency: client.currency ?? 'USD',
        fromName: 'PM Tool',
      }).catch(() => {});
    }
    return updated;
  }

  async approveProposal(id: number, userRoles: string[], userClientId?: number) {
    const project = await this.findOne(id);
    const isInternalApprover = userRoles.some(r => MANAGER_ROLES.includes(r));
    const isMatchingClient = userRoles.includes('CLIENT') && userClientId === project.clientId;
    if (!isInternalApprover && !isMatchingClient) {
      throw new ForbiddenException('Not authorized to approve this proposal');
    }
    if ((project as any).proposalStatus !== 'SENT') {
      throw new BadRequestException(`Cannot approve proposal in ${(project as any).proposalStatus} status`);
    }

    const data: any = { proposalStatus: 'APPROVED', proposalRespondedAt: new Date() };
    if (project.status === 'DRAFT') data.status = 'ACTIVE';
    return this.prisma.project.update({ where: { id }, data, include: PROJECT_INCLUDE });
  }

  async declineProposal(id: number, note: string, userRoles: string[], userClientId?: number) {
    if (!note?.trim()) throw new BadRequestException('A decline reason is required');
    const project = await this.findOne(id);
    const isInternalApprover = userRoles.some(r => MANAGER_ROLES.includes(r));
    const isMatchingClient = userRoles.includes('CLIENT') && userClientId === project.clientId;
    if (!isInternalApprover && !isMatchingClient) {
      throw new ForbiddenException('Not authorized to decline this proposal');
    }
    if ((project as any).proposalStatus !== 'SENT') {
      throw new BadRequestException(`Cannot decline proposal in ${(project as any).proposalStatus} status`);
    }
    return this.prisma.project.update({
      where: { id },
      data: { proposalStatus: 'DECLINED', proposalRespondedAt: new Date(), proposalRevisionNote: note } as any,
      include: PROJECT_INCLUDE,
    });
  }

  async requestProposalRevision(id: number, note: string, userRoles: string[], userClientId?: number) {
    if (!note?.trim()) throw new BadRequestException('Revision instructions are required');
    const project = await this.findOne(id);
    const isInternalApprover = userRoles.some(r => MANAGER_ROLES.includes(r));
    const isMatchingClient = userRoles.includes('CLIENT') && userClientId === project.clientId;
    if (!isInternalApprover && !isMatchingClient) {
      throw new ForbiddenException('Not authorized to request revision on this proposal');
    }
    if ((project as any).proposalStatus !== 'SENT') {
      throw new BadRequestException(`Cannot request revision on proposal in ${(project as any).proposalStatus} status`);
    }
    return this.prisma.project.update({
      where: { id },
      data: { proposalStatus: 'REVISION_REQUESTED', proposalRespondedAt: new Date(), proposalRevisionNote: note } as any,
      include: PROJECT_INCLUDE,
    });
  }

  async reviseProposal(id: number) {
    const project = await this.findOne(id);
    const allowed = PROPOSAL_TRANSITIONS[(project as any).proposalStatus] ?? [];
    if (!allowed.includes('DRAFT')) {
      throw new BadRequestException(`Cannot start a new revision from ${(project as any).proposalStatus} status`);
    }
    return this.prisma.project.update({
      where: { id },
      data: {
        proposalStatus: 'DRAFT',
        proposalVersion: { increment: 1 },
        proposalRespondedAt: null,
        proposalRevisionNote: null,
      } as any,
      include: PROJECT_INCLUDE,
    });
  }
}
