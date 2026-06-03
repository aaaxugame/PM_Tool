import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

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

  create(dto: CreateTaskDto, userId: number) {
    const { dueDate, ...rest } = dto;
    return this.prisma.task.create({
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        createdById: userId,
      },
      include: {
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: number, dto: UpdateTaskDto) {
    const existing = await this.findOne(id);
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

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.task.delete({ where: { id } });
  }
}
