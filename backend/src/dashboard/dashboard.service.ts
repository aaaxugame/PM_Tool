import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: number) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const [
      activeProjects,
      openTasks,
      pendingTimesheets,
      hoursThisWeek,
      outstandingInvoices,
      recentProjects,
      recentInvoices,
    ] = await Promise.all([
      this.prisma.project.count({ where: { status: 'ACTIVE' } }),
      this.prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] } } }),
      this.prisma.timesheet.count({ where: { userId, status: 'SUBMITTED' } }),
      this.prisma.timeEntry.aggregate({
        where: { userId, date: { gte: weekStart } },
        _sum: { durationMinutes: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: { in: ['SENT', 'OVERDUE'] } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.project.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, status: true, createdAt: true,
          client: { select: { id: true, name: true } },
          _count: { select: { tasks: true } },
        },
      }),
      this.prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, status: true, total: true, dueDate: true, invoiceDate: true,
          client: { select: { id: true, name: true } },
        },
      }),
    ]);

    const weekMinutes = hoursThisWeek._sum.durationMinutes ?? 0;

    return {
      activeProjects,
      openTasks,
      pendingTimesheets,
      hoursThisWeek: `${Math.floor(weekMinutes / 60)}h ${weekMinutes % 60}m`,
      outstandingInvoiceCount: outstandingInvoices._count,
      outstandingInvoiceTotal: Number(outstandingInvoices._sum.total ?? 0),
      recentProjects,
      recentInvoices,
    };
  }

  async getTimeReport(filters: { projectId?: number; from?: string; to?: string }) {
    const where: any = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Group by project
    const byProject: Record<string, { projectId: number; projectName: string; totalMinutes: number; entries: number }> = {};
    for (const e of entries) {
      const key = String(e.projectId ?? 0);
      if (!byProject[key]) {
        byProject[key] = {
          projectId: e.projectId ?? 0,
          projectName: e.project?.name ?? 'No Project',
          totalMinutes: 0,
          entries: 0,
        };
      }
      byProject[key].totalMinutes += e.durationMinutes;
      byProject[key].entries += 1;
    }

    const totalMinutes = entries.reduce((s, e) => s + e.durationMinutes, 0);

    return {
      totalMinutes,
      totalHours: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      byProject: Object.values(byProject).sort((a, b) => b.totalMinutes - a.totalMinutes),
      entries: entries.map(e => ({
        id: e.id,
        date: e.date,
        durationMinutes: e.durationMinutes,
        description: e.description,
        project: e.project,
        user: e.user,
        task: e.task,
      })),
    };
  }

  async getInvoiceReport(filters: { clientId?: number; from?: string; to?: string }) {
    const where: any = {};
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.from || filters.to) {
      where.invoiceDate = {};
      if (filters.from) where.invoiceDate.gte = new Date(filters.from);
      if (filters.to) where.invoiceDate.lte = new Date(filters.to);
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const byStatus = { DRAFT: 0, SENT: 0, PAID: 0, OVERDUE: 0 };
    let totalBilled = 0;
    let totalCollected = 0;

    for (const inv of invoices) {
      byStatus[inv.status] = (byStatus[inv.status] ?? 0) + Number(inv.total);
      totalBilled += Number(inv.total);
      totalCollected += inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    }

    return {
      totalBilled,
      totalCollected,
      outstanding: totalBilled - totalCollected,
      byStatus,
      invoices: invoices.map(inv => ({
        id: inv.id,
        status: inv.status,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        total: Number(inv.total),
        collected: inv.payments.reduce((s, p) => s + Number(p.amount), 0),
        client: inv.client,
      })),
    };
  }
}
