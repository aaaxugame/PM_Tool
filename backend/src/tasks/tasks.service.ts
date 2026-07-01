import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus, Priority } from '@prisma/client';

export interface TaskFilters {
  projectId?: number;
  milestoneId?: number;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: number;
}

export interface RequestUser {
  id: number;
  roles: string[];
  vendor: { id: number } | null;
}

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER'];

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async assertCanManageProjectTasks(user: RequestUser, projectId: number) {
    if (user.roles.some(r => MANAGER_ROLES.includes(r))) return;

    if (user.roles.includes('TEAM_MEMBER')) {
      const member = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: user.id } },
      });
      if (member) return;
    }

    if ((user.roles.includes('CONTRACTOR') || user.roles.includes('VENDOR_CONTACT')) && user.vendor) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { assignedVendorId: true },
      });
      if (project?.assignedVendorId === user.vendor.id) return;
    }

    throw new ForbiddenException('You do not have permission to manage tasks on this project');
  }

  findAll(filters: TaskFilters = {}) {
    const where: any = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.milestoneId) where.milestoneId = filters.milestoneId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;

    return this.prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async create(dto: CreateTaskDto, user: RequestUser) {
    await this.assertCanManageProjectTasks(user, dto.projectId);

    const { dueDate, ...rest } = dto;
    return this.prisma.task.create({
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        createdById: user.id,
      },
      include: {
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: number, dto: UpdateTaskDto, user: RequestUser) {
    const existing = await this.findOne(id);
    await this.assertCanManageProjectTasks(user, existing.projectId);
    if (dto.projectId && dto.projectId !== existing.projectId) {
      await this.assertCanManageProjectTasks(user, dto.projectId);
    }

    const { dueDate, ...rest } = dto;
    const data: any = { ...rest };
    if (dueDate !== undefined) data.dueDate = new Date(dueDate);

    const updated = await this.prisma.task.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  async remove(id: number, user: RequestUser) {
    const existing = await this.findOne(id);
    await this.assertCanManageProjectTasks(user, existing.projectId);
    return this.prisma.task.delete({ where: { id } });
  }
}
