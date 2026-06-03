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

  async getVendorDashboard(vendorId: number) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [vendor, projects, invoices, pendingQuotes, approvedQuotes] = await Promise.all([
      this.prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { id: true, name: true, contactEmail: true, contactPhone: true },
      }),
      this.prisma.project.findMany({
        where: { vendorQuotes: { some: { vendorId } } },
        include: {
          tasks: { where: { dueDate: { lt: now }, status: { not: 'DONE' as any } }, select: { id: true } },
          _count: { select: { tasks: true } },
        },
      }),
      this.prisma.invoice.findMany({
        where: { vendorId, invoiceType: 'VENDOR' as any },
        include: { payments: { select: { amount: true } } },
      }),
      this.prisma.vendorQuote.count({ where: { vendorId, status: 'SUBMITTED' as any } }),
      this.prisma.vendorQuote.findMany({
        where: { vendorId, status: 'APPROVED' as any },
        select: { quotedPrice: true },
      }),
    ]);

    const approvalDist: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    const healthDist: Record<string, number> = { NOT_STARTED: 0, ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 };
    const totalContractValue = approvedQuotes.reduce((s, q) => s + Number(q.quotedPrice), 0);

    for (const p of projects) {
      approvalDist[p.approvalStatus] = (approvalDist[p.approvalStatus] ?? 0) + 1;
      if (p.status === 'DRAFT' || (p._count.tasks === 0)) healthDist.NOT_STARTED++;
      else if (p.endDate && p.endDate < now && !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(p.status)) healthDist.DELAYED++;
      else if (p.tasks.length > 0) healthDist.AT_RISK++;
      else healthDist.ON_TRACK++;
    }

    let invoicedAmount = 0, paidAmount = 0;
    for (const inv of invoices) {
      invoicedAmount += Number(inv.total);
      paidAmount += inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    }

    // Recent invoices (last 5)
    const recentInvoices = await this.prisma.invoice.findMany({
      where: { vendorId, invoiceType: 'VENDOR' as any },
      orderBy: { invoiceDate: 'desc' },
      take: 5,
      select: { id: true, status: true, total: true, dueDate: true, invoiceDate: true },
    });

    return {
      vendor,
      totalProjects: projects.length,
      approvalDist,
      healthDist,
      totalContractValue,
      invoicedAmount,
      paidAmount,
      outstandingAmount: invoicedAmount - paidAmount,
      pendingQuotes,
      recentInvoices,
    };
  }

  async getPMDashboard(userId: number) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const assignments = await this.prisma.projectAssignment.findMany({
      where: { userId, assignmentRole: 'PROJECT_MANAGER' as any },
      select: { projectId: true },
    });
    const projectIds = assignments.map(a => a.projectId);

    if (projectIds.length === 0) {
      return {
        projectCount: 0, statusDist: {}, healthDist: { NOT_STARTED: 0, ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 },
        taskHealth: {}, upcomingMilestones: [], overdueTasks: [],
        hoursThisWeek: '0h 0m', pendingTimesheets: 0, budgetUtilization: [],
      };
    }

    const [projects, taskGroups, upcomingMilestones, overdueTasks, weekHours, pendingTimesheets, projectHours] = await Promise.all([
      this.prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true, status: true, endDate: true, estimatedHours: true, _count: { select: { tasks: true } }, tasks: { where: { dueDate: { lt: now }, status: { not: 'DONE' as any } }, select: { id: true } } },
      }),
      this.prisma.task.groupBy({ by: ['status'], where: { projectId: { in: projectIds } }, _count: { id: true } }),
      this.prisma.milestone.findMany({
        where: { projectId: { in: projectIds }, dueDate: { gte: now, lte: in30 }, status: 'PENDING' as any },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' }, take: 8,
      }),
      this.prisma.task.findMany({
        where: { projectId: { in: projectIds }, dueDate: { lt: now }, status: { not: 'DONE' as any } },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' }, take: 8,
      }),
      this.prisma.timeEntry.aggregate({ where: { projectId: { in: projectIds }, date: { gte: weekStart } }, _sum: { durationMinutes: true } }),
      this.prisma.timesheet.count({ where: { status: 'SUBMITTED' as any } }),
      this.prisma.timeEntry.groupBy({ by: ['projectId'], where: { projectId: { in: projectIds } }, _sum: { durationMinutes: true } }),
    ]);

    const statusDist: Record<string, number> = {};
    const healthDist: Record<string, number> = { NOT_STARTED: 0, ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 };
    for (const p of projects) {
      statusDist[p.status] = (statusDist[p.status] ?? 0) + 1;
      if (p.status === 'DRAFT' || p._count.tasks === 0) healthDist.NOT_STARTED++;
      else if (p.endDate && p.endDate < now && !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(p.status)) healthDist.DELAYED++;
      else if (p.tasks.length > 0) healthDist.AT_RISK++;
      else healthDist.ON_TRACK++;
    }

    const taskHealth: Record<string, number> = {};
    for (const g of taskGroups) taskHealth[g.status] = g._count.id;

    const hoursMap = new Map(projectHours.map(h => [h.projectId, h._sum.durationMinutes ?? 0]));
    const budgetUtilization = projects.map(p => ({
      projectId: p.id, projectName: p.name,
      estimatedHours: Number(p.estimatedHours ?? 0),
      loggedHours: Math.round((hoursMap.get(p.id) ?? 0) / 60 * 10) / 10,
    }));

    const wm = weekHours._sum.durationMinutes ?? 0;
    return {
      projectCount: projectIds.length, statusDist, healthDist, taskHealth,
      upcomingMilestones, overdueTasks,
      hoursThisWeek: `${Math.floor(wm / 60)}h ${wm % 60}m`,
      pendingTimesheets, budgetUtilization,
    };
  }

  async getAMDashboard(userId: number) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const assignments = await this.prisma.projectAssignment.findMany({
      where: { userId, assignmentRole: 'ACCOUNT_MANAGER' as any },
      select: { projectId: true },
    });
    const projectIds = assignments.map(a => a.projectId);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0, activeProjects: 0, totalClients: 0, totalContractValue: 0,
        revenue: { totalBilled: 0, totalCollected: 0, outstanding: 0 },
        byClient: [], actionableInvoices: [], upcomingMilestoneTriggers: [],
        pendingQuotes: 0, pendingApprovals: 0,
      };
    }

    const [projects, invoices, pendingQuotes, pendingApprovals, upcomingMilestoneTriggers] = await Promise.all([
      this.prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true, status: true, approvalStatus: true, proposedCost: true, clientId: true, client: { select: { id: true, name: true } } },
      }),
      this.prisma.invoice.findMany({
        where: { projectId: { in: projectIds }, invoiceType: 'CLIENT' as any },
        include: { payments: { select: { amount: true } }, client: { select: { id: true, name: true } } },
      }),
      this.prisma.vendorQuote.count({ where: { projectId: { in: projectIds }, status: { in: ['PENDING', 'SUBMITTED'] as any } } }),
      this.prisma.project.count({ where: { id: { in: projectIds }, approvalStatus: 'PENDING' as any } }),
      this.prisma.milestone.findMany({
        where: { projectId: { in: projectIds }, triggersInvoice: true, status: 'PENDING' as any, dueDate: { gte: now, lte: in30 } },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' }, take: 8,
      }),
    ]);

    let totalBilled = 0, totalCollected = 0;
    for (const inv of invoices) {
      totalBilled += Number(inv.total);
      totalCollected += inv.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    }

    const byClientMap = new Map<number, any>();
    for (const p of projects as any[]) {
      const existing = byClientMap.get(p.clientId) ?? { clientId: p.clientId, clientName: p.client.name, totalProjects: 0, activeProjects: 0, totalValue: 0 };
      existing.totalProjects++;
      if (p.status === 'ACTIVE') existing.activeProjects++;
      existing.totalValue += Number(p.proposedCost ?? 0);
      byClientMap.set(p.clientId, existing);
    }

    const actionableInvoices = invoices
      .filter(inv => ['DRAFT', 'SUBMITTED'].includes(inv.status))
      .slice(0, 8)
      .map(inv => ({ id: inv.id, status: inv.status, total: Number(inv.total), client: inv.client, dueDate: inv.dueDate }));

    return {
      totalProjects: projectIds.length,
      activeProjects: (projects as any[]).filter(p => p.status === 'ACTIVE').length,
      totalClients: new Set((projects as any[]).map(p => p.clientId)).size,
      totalContractValue: (projects as any[]).reduce((s, p) => s + Number(p.proposedCost ?? 0), 0),
      revenue: { totalBilled, totalCollected, outstanding: totalBilled - totalCollected },
      byClient: Array.from(byClientMap.values()),
      actionableInvoices,
      upcomingMilestoneTriggers,
      pendingQuotes,
      pendingApprovals,
    };
  }

  async getClientDashboard(clientId: number) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [projects, invoices, upcomingMilestones, recentActivity] = await Promise.all([
      this.prisma.project.findMany({
        where: { clientId },
        include: {
          tasks: { select: { id: true, status: true } },
          assignments: { include: { user: { select: { id: true, name: true } } } },
          _count: { select: { tasks: true } },
        },
      }),
      this.prisma.invoice.findMany({
        where: { clientId, invoiceType: 'CLIENT' as any },
        include: { payments: { select: { amount: true } } },
        orderBy: { invoiceDate: 'desc' },
      }),
      this.prisma.milestone.findMany({
        where: { project: { clientId }, dueDate: { gte: now, lte: in30 }, status: 'PENDING' as any },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' }, take: 8,
      }),
      this.prisma.timeEntry.findMany({
        where: { project: { clientId } },
        include: { user: { select: { id: true, name: true } }, project: { select: { id: true, name: true } }, task: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' }, take: 8,
      }),
    ]);

    const projectCards = projects.map(p => {
      const done = p.tasks.filter((t: any) => t.status === 'DONE').length;
      const pct = p._count.tasks > 0 ? Math.round((done / p._count.tasks) * 100) : 0;
      return {
        id: p.id, name: p.name, status: p.status, approvalStatus: p.approvalStatus,
        pct, totalTasks: p._count.tasks, doneTasks: done,
        startDate: p.startDate, endDate: p.endDate,
        pm: p.assignments.find((a: any) => a.assignmentRole === 'PROJECT_MANAGER')?.user ?? null,
        am: p.assignments.find((a: any) => a.assignmentRole === 'ACCOUNT_MANAGER')?.user ?? null,
      };
    });

    let totalInvoiced = 0, totalPaid = 0;
    for (const inv of invoices) {
      totalInvoiced += Number(inv.total);
      totalPaid += inv.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    }
    const totalContracted = projects.reduce((s, p) => s + Number(p.proposedCost ?? 0), 0);

    const openInvoices = invoices
      .filter(inv => ['SENT', 'OVERDUE', 'SUBMITTED', 'APPROVED'].includes(inv.status))
      .slice(0, 8)
      .map(inv => ({ id: inv.id, status: inv.status, total: Number(inv.total), dueDate: inv.dueDate, invoiceDate: inv.invoiceDate }));

    const teamSet = new Map<number, { id: number; name: string }>();
    for (const p of projects) {
      for (const a of p.assignments as any[]) teamSet.set(a.user.id, a.user);
    }

    return {
      projectCards,
      billing: { totalContracted, totalInvoiced, totalPaid, outstanding: totalInvoiced - totalPaid },
      openInvoices,
      upcomingMilestones,
      recentActivity: recentActivity.map(e => ({
        id: e.id, date: e.date, durationMinutes: e.durationMinutes,
        description: e.description, user: e.user, project: e.project, task: e.task,
      })),
      teamMembers: Array.from(teamSet.values()),
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
