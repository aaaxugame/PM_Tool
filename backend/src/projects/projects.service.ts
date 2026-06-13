import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from '@prisma/client';

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
  constructor(private prisma: PrismaService) {}

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
        assignments: { some: { userId } },
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

  async findOne(id: number) {
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
    return project;
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
}
