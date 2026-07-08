import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { LOCKED_MILESTONE_FIELDS } from './projects.service';

@Injectable()
export class MilestonesService {
  constructor(private prisma: PrismaService) {}

  findAll(projectId: number) {
    return this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findOne(projectId: number, id: number) {
    const m = await this.prisma.milestone.findFirst({ where: { id, projectId } });
    if (!m) throw new NotFoundException(`Milestone ${id} not found`);
    return m;
  }

  create(projectId: number, dto: CreateMilestoneDto) {
    const { dueDate, ...rest } = dto;
    return this.prisma.milestone.create({
      data: {
        ...rest,
        projectId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
    });
  }

  async update(projectId: number, id: number, dto: UpdateMilestoneDto) {
    await this.findOne(projectId, id);

    const touchesLockedField = LOCKED_MILESTONE_FIELDS.some(f => (dto as any)[f] !== undefined);
    if (touchesLockedField) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { proposalStatus: true, clientId: true },
      });
      if (project?.clientId && project.proposalStatus === 'APPROVED') {
        throw new BadRequestException(
          'Cannot change milestone terms on an approved proposal. Start a new proposal revision first.',
        );
      }
    }

    const { dueDate, ...rest } = dto;
    const data: any = { ...rest };
    if (dueDate !== undefined) data.dueDate = new Date(dueDate);
    if (rest.status === 'COMPLETED') data.completedAt = new Date();
    else if (rest.status === 'PENDING') data.completedAt = null;
    return this.prisma.milestone.update({ where: { id }, data });
  }

  async remove(projectId: number, id: number) {
    await this.findOne(projectId, id);
    return this.prisma.milestone.delete({ where: { id } });
  }
}
