import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: { projectId?: number; taskId?: number } = {}) {
    const where: any = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.taskId) where.taskId = filters.taskId;
    return this.prisma.budget.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const b = await this.prisma.budget.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
      },
    });
    if (!b) throw new NotFoundException(`Budget ${id} not found`);
    return b;
  }

  create(dto: CreateBudgetDto, userId: number) {
    return this.prisma.budget.create({
      data: { ...dto, enteredById: userId },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: number, dto: UpdateBudgetDto) {
    await this.findOne(id);
    return this.prisma.budget.update({
      where: { id },
      data: dto,
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.budget.delete({ where: { id } });
  }
}
