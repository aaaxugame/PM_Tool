import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';
import { TimesheetStatus } from '@prisma/client';

@Injectable()
export class TimesheetsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.timesheet.findMany({
      where: { userId },
      include: {
        _count: { select: { timeEntries: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { periodStart: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    const ts = await this.prisma.timesheet.findFirst({
      where: { id, userId },
      include: {
        timeEntries: {
          include: {
            project: { select: { id: true, name: true } },
            task: { select: { id: true, name: true } },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
        reviewedBy: { select: { id: true, name: true } },
      },
    });
    if (!ts) throw new NotFoundException(`Timesheet ${id} not found`);
    return ts;
  }

  create(dto: CreateTimesheetDto, userId: number) {
    return this.prisma.timesheet.create({
      data: {
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        userId,
      },
    });
  }

  async update(id: number, dto: UpdateTimesheetDto, userId: number, reviewerId?: number) {
    const ts = await this.findOne(id, userId);

    const VALID_TRANSITIONS: Partial<Record<TimesheetStatus, TimesheetStatus[]>> = {
      DRAFT: ['SUBMITTED'],
      SUBMITTED: ['APPROVED', 'REJECTED'],
      REJECTED: ['DRAFT'],
    };

    if (dto.status && dto.status !== ts.status) {
      const allowed = VALID_TRANSITIONS[ts.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(`Cannot transition from ${ts.status} to ${dto.status}`);
      }
    }

    return this.prisma.timesheet.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.status === 'APPROVED' || dto.status === 'REJECTED'
          ? { reviewedById: reviewerId }
          : {}),
      },
    });
  }

  async remove(id: number, userId: number) {
    const ts = await this.findOne(id, userId);
    if (ts.status !== 'DRAFT') throw new BadRequestException('Only DRAFT timesheets can be deleted');
    return this.prisma.timesheet.delete({ where: { id } });
  }
}
