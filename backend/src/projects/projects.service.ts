import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.project.findMany({
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { milestones: true, tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        milestones: { orderBy: { dueDate: 'asc' } },
        _count: { select: { tasks: true, timeEntries: true } },
      },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  create(dto: CreateProjectDto, userId: number) {
    const { startDate, endDate, ...rest } = dto;
    return this.prisma.project.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        createdById: userId,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: number, dto: UpdateProjectDto) {
    await this.findOne(id);
    const { startDate, endDate, ...rest } = dto;
    return this.prisma.project.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.project.delete({ where: { id } });
  }
}
