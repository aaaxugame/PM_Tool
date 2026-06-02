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

  findAllSubmitted() {
    return this.prisma.timesheet.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        _count: { select: { timeEntries: true } },
        user: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
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

  async create(dto: CreateTimesheetDto, userId: number) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    const timesheet = await this.prisma.timesheet.create({
      data: { periodStart, periodEnd, userId },
    });

    // Auto-link unassigned entries that fall within this period
    await this.prisma.timeEntry.updateMany({
      where: {
        userId,
        timesheetId: null,
        date: { gte: periodStart, lte: periodEnd },
      },
      data: { timesheetId: timesheet.id },
    });

    return timesheet;
  }

  async update(id: number, dto: UpdateTimesheetDto, userId: number) {
    const ts = await this.findOne(id, userId);

    if (dto.status === 'APPROVED' || dto.status === 'REJECTED') {
      throw new BadRequestException('Use the dedicated approve/reject endpoints');
    }

    const VALID_TRANSITIONS: Partial<Record<TimesheetStatus, TimesheetStatus[]>> = {
      DRAFT: ['SUBMITTED'],
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
      data: dto,
    });
  }

  async approve(id: number, reviewerId: number) {
    const ts = await this.prisma.timesheet.findUnique({ where: { id } });
    if (!ts) throw new NotFoundException(`Timesheet ${id} not found`);
    if (ts.status !== 'SUBMITTED') {
      throw new BadRequestException(`Cannot approve a timesheet in ${ts.status} status`);
    }
    return this.prisma.timesheet.update({
      where: { id },
      data: { status: 'APPROVED', reviewedById: reviewerId },
    });
  }

  async reject(id: number, reviewerId: number, rejectionReason: string) {
    const ts = await this.prisma.timesheet.findUnique({ where: { id } });
    if (!ts) throw new NotFoundException(`Timesheet ${id} not found`);
    if (ts.status !== 'SUBMITTED') {
      throw new BadRequestException(`Cannot reject a timesheet in ${ts.status} status`);
    }
    return this.prisma.timesheet.update({
      where: { id },
      data: { status: 'REJECTED', reviewedById: reviewerId, rejectionReason },
    });
  }

  async remove(id: number, userId: number) {
    const ts = await this.findOne(id, userId);
    if (ts.status !== 'DRAFT') throw new BadRequestException('Only DRAFT timesheets can be deleted');
    return this.prisma.timesheet.delete({ where: { id } });
  }
}
