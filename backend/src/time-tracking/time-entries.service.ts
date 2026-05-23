import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';

function parseMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function toTimeDate(t: string): Date {
  return new Date(`1970-01-01T${t}:00.000Z`);
}

@Injectable()
export class TimeEntriesService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: number, filters: { projectId?: number; from?: string; to?: string } = {}) {
    const where: any = { userId };
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }
    return this.prisma.timeEntry.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
        timesheet: { select: { id: true, status: true } },
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });
  }

  async findOne(id: number, userId: number) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException(`Time entry ${id} not found`);
    return entry;
  }

  create(dto: CreateTimeEntryDto, userId: number) {
    const duration = parseMinutes(dto.endTime) - parseMinutes(dto.startTime);
    if (duration <= 0) throw new BadRequestException('endTime must be after startTime');
    const { date, startTime, endTime, ...rest } = dto;
    return this.prisma.timeEntry.create({
      data: {
        ...rest,
        date: new Date(date),
        startTime: toTimeDate(startTime),
        endTime: toTimeDate(endTime),
        durationMinutes: duration,
        userId,
      },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: number, dto: UpdateTimeEntryDto, userId: number) {
    const entry = await this.findOne(id, userId);
    if (entry.isLocked) throw new BadRequestException('Cannot edit a locked time entry');

    const data: any = {};
    if (dto.date) data.date = new Date(dto.date);
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.projectId) data.projectId = dto.projectId;
    if (dto.taskId !== undefined) data.taskId = dto.taskId;
    if (dto.timesheetId !== undefined) data.timesheetId = dto.timesheetId;
    if (dto.isBillable !== undefined) data.isBillable = dto.isBillable;

    if (dto.startTime || dto.endTime) {
      const newStart = dto.startTime ?? entry.startTime.toISOString().slice(11, 16);
      const newEnd = dto.endTime ?? entry.endTime.toISOString().slice(11, 16);
      const duration = parseMinutes(newEnd) - parseMinutes(newStart);
      if (duration <= 0) throw new BadRequestException('endTime must be after startTime');
      if (dto.startTime) data.startTime = toTimeDate(dto.startTime);
      if (dto.endTime) data.endTime = toTimeDate(dto.endTime);
      data.durationMinutes = duration;
    }

    return this.prisma.timeEntry.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: number, userId: number) {
    const entry = await this.findOne(id, userId);
    if (entry.isLocked) throw new BadRequestException('Cannot delete a locked time entry');
    return this.prisma.timeEntry.delete({ where: { id } });
  }
}
