import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceStatus, InvoiceType, BillingMethod } from '@prisma/client';

const INVOICE_INCLUDE = {
  client:      { select: { id: true, name: true } },
  vendor:      { select: { id: true, name: true } },
  project:     { select: { id: true, name: true, billingMethod: true } },
  milestone:   { select: { id: true, name: true } },
  vendorQuote: { select: { id: true, quotedPrice: true, paymentMode: true } },
  createdBy:   { select: { id: true, name: true } },
  approvedBy:  { select: { id: true, name: true } },
  parentInvoice: { select: { id: true, version: true } },
  lineItems: {
    include: {
      timeEntry: { select: { id: true, date: true, durationMinutes: true, description: true } },
      milestone: { select: { id: true, name: true } },
      task:      { select: { id: true, name: true } },
    },
  },
  payments: {
    include: { recordedBy: { select: { id: true, name: true } } },
    orderBy: { paymentDate: 'desc' as const },
  },
  documents: {
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private mail:   MailService,
  ) {}

  // ── Read ────────────────────────────────────────────────────────────────────

  findAll(filters: {
    clientId?: number; projectId?: number; vendorId?: number;
    status?: InvoiceStatus; invoiceType?: InvoiceType;
    excludeStatuses?: InvoiceStatus[];
  } = {}) {
    const where: any = {};
    if (filters.clientId)    where.clientId    = filters.clientId;
    if (filters.projectId)   where.projectId   = filters.projectId;
    if (filters.vendorId)    where.vendorId    = filters.vendorId;
    if (filters.status)                        where.status = filters.status;
    else if (filters.excludeStatuses?.length)  where.status = { notIn: filters.excludeStatuses };
    if (filters.invoiceType) where.invoiceType = filters.invoiceType;
    return this.prisma.invoice.findMany({
      where,
      include: {
        client:    { select: { id: true, name: true } },
        vendor:    { select: { id: true, name: true } },
        project:   { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy:{ select: { id: true, name: true } },
        _count:    { select: { lineItems: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const inv = await this.prisma.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
    if (!inv) throw new NotFoundException(`Invoice ${id} not found`);
    return inv;
  }

  // ── Eligible items for auto-generate / manual invoice builder ───────────────

  async getEligibleItems(projectId: number, vendorId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, billingMethod: true, hourlyRate: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const vendorQuote = await this.prisma.vendorQuote.findFirst({
      where: { projectId, vendorId, status: 'APPROVED' },
      select: { id: true, quotedPrice: true, hourlyRate: true, estimatedHours: true },
    });

    // Approved, unbilled time entries for this vendor on this project
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        projectId,
        isBillable: true,
        isBilled: false,
        isLocked: false,
        user: { vendorId },
        OR: [
          { timesheet: { status: 'APPROVED' } },
          { timesheetId: null },
        ],
      },
      include: {
        task:      { select: { id: true, name: true } },
        timesheet: { select: { id: true, status: true } },
        user:      { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Completed milestones not yet fully invoiced on this project
    const allMilestones = await this.prisma.milestone.findMany({
      where: { projectId, status: 'COMPLETED' },
      include: {
        invoiceLineItems: {
          include: { invoice: { select: { status: true } } },
        },
      },
    });

    const eligibleMilestones = allMilestones.filter(m => {
      const alreadyInvoiced = m.invoiceLineItems.some(li =>
        ['SUBMITTED', 'APPROVED', 'PAID'].includes(li.invoice?.status ?? ''),
      );
      return !alreadyInvoiced;
    });

    return {
      billingMethod: project.billingMethod,
      projectHourlyRate: project.hourlyRate,
      vendorQuote,
      timeEntries,
      milestones: eligibleMilestones.map(({ invoiceLineItems: _drop, ...m }) => m),
    };
  }

  // ── Auto-generate DRAFT invoice based on billing method ─────────────────────

  async autoGenerateDraft(projectId: number, vendorId: number, userId: number) {
    const eligible = await this.getEligibleItems(projectId, vendorId);
    const { billingMethod, projectHourlyRate, vendorQuote, timeEntries, milestones } = eligible;

    const today = new Date();
    const due   = new Date(today); due.setDate(due.getDate() + 30);

    const lineItems: any[] = [];

    if (billingMethod === BillingMethod.TIME_AND_MATERIALS || billingMethod === BillingMethod.MIXED) {
      const rate = Number(vendorQuote?.hourlyRate ?? projectHourlyRate ?? null);
      if (!rate) {
        throw new BadRequestException(
          'No hourly rate found. Set an hourly rate on the project or use "Build manually" to enter amounts yourself.',
        );
      }
      for (const te of timeEntries) {
        const hours = te.durationMinutes / 60;
        lineItems.push({
          description: `${te.task?.name ?? 'Time entry'} — ${new Date(te.date).toLocaleDateString()}`,
          quantity:    Math.round(hours * 100) / 100,
          unitPrice:   rate,
          amount:      Math.round(hours * rate * 100) / 100,
          lineItemType: 'TIME_AND_MATERIALS' as const,
          timeEntryId: te.id,
        });
      }
    }

    if (billingMethod === BillingMethod.MILESTONE || billingMethod === BillingMethod.MIXED) {
      for (const m of milestones) {
        const price = Number(vendorQuote?.quotedPrice ?? 0) / Math.max(milestones.length, 1);
        lineItems.push({
          description: m.name,
          quantity:    1,
          unitPrice:   price,
          amount:      price,
          lineItemType: 'FIXED' as const,
          milestoneId: m.id,
        });
      }
    }

    if (billingMethod === BillingMethod.FIXED) {
      const price = Number(vendorQuote?.quotedPrice ?? 0);
      lineItems.push({
        description: 'Project deliverable (fixed price)',
        quantity:    1,
        unitPrice:   price,
        amount:      price,
        lineItemType: 'FIXED' as const,
      });
    }

    if (lineItems.length === 0) {
      throw new BadRequestException('No eligible items found to generate invoice. Ensure timesheets are approved or milestones are completed.');
    }

    const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);

    return this.prisma.invoice.create({
      data: {
        invoiceType: 'VENDOR',
        status:      'DRAFT',
        triggerType: 'MANUAL',
        invoiceDate: today,
        dueDate:     due,
        subtotal,
        taxRate:     0,
        taxAmount:   0,
        total:       subtotal,
        vendorId,
        projectId,
        vendorQuoteId: vendorQuote?.id ?? undefined,
        createdById: userId,
        version:     1,
        lineItems: { create: lineItems },
      },
      include: INVOICE_INCLUDE,
    });
  }

  // ── Create (manual) ─────────────────────────────────────────────────────────

  async create(dto: CreateInvoiceDto, userId: number) {
    const {
      lineItems, invoiceDate, dueDate, taxRate = 0,
      triggerType = 'MANUAL', invoiceType = 'CLIENT',
      clientId, vendorId, vendorQuoteId, parentInvoiceId, ...rest
    } = dto;

    if (invoiceType === 'CLIENT' && !clientId) throw new BadRequestException('clientId is required for CLIENT invoices');
    if (invoiceType === 'VENDOR' && !vendorId) throw new BadRequestException('vendorId is required for VENDOR invoices');

    // Determine version if this is a revision
    let version = 1;
    if (parentInvoiceId) {
      const parent = await this.findOne(parentInvoiceId);
      version = parent.version + 1;
    }

    const subtotal  = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total     = subtotal + taxAmount;

    // Inherit currency from client or vendor if not supplied
    let currency = rest.currency ?? 'USD';
    if (!rest.currency) {
      if (clientId) {
        const client = await this.prisma.client.findUnique({ where: { id: clientId }, select: { currency: true } });
        if (client?.currency) currency = client.currency;
      } else if (vendorId) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId }, select: { currency: true } });
        if (vendor?.currency) currency = vendor.currency;
      }
    }
    const { currency: _c, ...restWithoutCurrency } = rest;

    return this.prisma.invoice.create({
      data: {
        ...restWithoutCurrency,
        invoiceType,
        triggerType,
        version,
        currency,
        invoiceDate:    new Date(invoiceDate),
        dueDate:        new Date(dueDate),
        subtotal,
        taxRate,
        taxAmount,
        total,
        createdById:    userId,
        ...(clientId       ? { clientId }       : {}),
        ...(vendorId       ? { vendorId }        : {}),
        ...(vendorQuoteId  ? { vendorQuoteId }   : {}),
        ...(parentInvoiceId ? { parentInvoiceId } : {}),
        lineItems: {
          create: lineItems.map(item => ({
            description:  item.description,
            quantity:     item.quantity,
            unitPrice:    item.unitPrice,
            amount:       item.quantity * item.unitPrice,
            lineItemType: item.lineItemType ?? 'FIXED',
            receiptNote:  item.receiptNote,
            taskId:       item.taskId,
            milestoneId:  item.milestoneId,
            timeEntryId:  item.timeEntryId,
          })),
        },
      },
      include: INVOICE_INCLUDE,
    });
  }

  // ── Update (DRAFT only, enforced by role/ownership in controller) ───────────

  async update(id: number, dto: UpdateInvoiceDto, userId: number, userRoles: string[]) {
    const inv = await this.findOne(id);

    const canManage = userRoles.some(r => ['ADMIN', 'SUPER_ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER'].includes(r));
    const isVendor  = userRoles.some(r => ['VENDOR_CONTACT', 'CONTRACTOR'].includes(r));

    if (!canManage && !isVendor) throw new ForbiddenException('Not authorized to edit invoices');

    // Vendors can only edit their own DRAFT vendor invoices
    if (isVendor && !canManage) {
      if (inv.invoiceType !== 'VENDOR') throw new ForbiddenException('Vendors can only edit vendor invoices');
      if (inv.status !== 'DRAFT')       throw new BadRequestException('Only DRAFT invoices can be edited');
    }

    // PMs can only edit DRAFT client invoices
    if (canManage && inv.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be edited');
    }

    const VALID_TRANSITIONS: Partial<Record<InvoiceStatus, InvoiceStatus[]>> = {
      DRAFT:    ['SENT'],
      SENT:     ['PAID', 'OVERDUE', 'APPROVED'],
      OVERDUE:  ['PAID', 'SENT'],
      APPROVED: ['PAID'],
      REJECTED: ['DRAFT'],
    };

    if (dto.status && dto.status !== inv.status) {
      const allowed = VALID_TRANSITIONS[inv.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(`Cannot transition from ${inv.status} to ${dto.status}`);
      }
    }

    const { lineItems: newLineItems, clientId, projectId, ...rest } = dto;
    const data: any = { ...rest };
    if (dto.invoiceDate) data.invoiceDate = new Date(dto.invoiceDate);
    if (dto.dueDate)     data.dueDate     = new Date(dto.dueDate);
    if (dto.status === 'SENT') data.sentAt = new Date();
    if (dto.status === 'PAID') data.paidAt = new Date();
    if (clientId  !== undefined) data.clientId  = clientId  || null;
    if (projectId !== undefined) data.projectId = projectId || null;

    if (newLineItems && newLineItems.length > 0) {
      const subtotal  = newLineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
      const taxRate   = data.taxRate ?? Number(inv.taxRate);
      const taxAmount = subtotal * (taxRate / 100);
      data.subtotal   = subtotal;
      data.taxAmount  = taxAmount;
      data.total      = subtotal + taxAmount;

      await this.prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      data.lineItems = {
        create: newLineItems.map(li => ({
          description:  li.description,
          quantity:     li.quantity,
          unitPrice:    li.unitPrice,
          amount:       li.quantity * li.unitPrice,
          lineItemType: (li.lineItemType as any) ?? 'FIXED',
        })),
      };
    }

    const updated = await this.prisma.invoice.update({ where: { id }, data, include: INVOICE_INCLUDE });

    // Fire notification when a CLIENT invoice is marked SENT
    if (dto.status === 'SENT' && inv.status === 'DRAFT' && updated.invoiceType === 'CLIENT') {
      const client = updated.clientId
        ? await this.prisma.client.findUnique({
            where:  { id: updated.clientId },
            select: { name: true, contactEmail: true },
          })
        : null;

      if (client?.contactEmail) {
        const dueDate = updated.dueDate
          ? new Date(updated.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : 'N/A';
        this.mail.sendInvoiceSent({
          toEmail:       client.contactEmail,
          toName:        client.name,
          invoiceNumber: `#${String(updated.id).padStart(4, '0')}`,
          projectName:   (updated as any).project?.name ?? 'N/A',
          total:         Number(updated.total).toFixed(2),
          currency:      updated.currency ?? 'USD',
          dueDate,
          fromName:      'PM Tool',
        }).catch(() => {}); // fire-and-forget, don't block the response
      }
    }

    return updated;
  }

  // ── Submit (vendor) — locks referenced time entries ─────────────────────────

  async submit(id: number, userId: number) {
    const inv = await this.findOne(id);
    if (inv.invoiceType !== 'VENDOR') throw new BadRequestException('Only vendor invoices can be submitted');
    if (inv.status !== 'DRAFT')       throw new BadRequestException(`Cannot submit invoice in ${inv.status} status`);

    // Lock all time entries referenced in line items
    const timeEntryIds = inv.lineItems
      .map((li: any) => li.timeEntryId)
      .filter(Boolean) as number[];

    if (timeEntryIds.length > 0) {
      await this.prisma.timeEntry.updateMany({
        where: { id: { in: timeEntryIds } },
        data:  { isBilled: true, isLocked: true },
      });
    }

    return this.prisma.invoice.update({
      where: { id },
      data:  { status: 'SUBMITTED' },
      include: INVOICE_INCLUDE,
    });
  }

  // ── Approve / Reject ─────────────────────────────────────────────────────────

  async approve(id: number, userId: number, userRoles: string[], userClientId?: number) {
    const inv = await this.findOne(id);

    if (inv.invoiceType === 'VENDOR') {
      const allowed = userRoles.some(r => ['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER'].includes(r));
      if (!allowed) throw new ForbiddenException('Not authorized to approve vendor invoices');
      if (inv.status !== 'SUBMITTED') throw new BadRequestException(`Cannot approve invoice in ${inv.status} status`);
    } else {
      const isInternalApprover = userRoles.some(r => ['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER'].includes(r));
      const isMatchingClient = userRoles.includes('CLIENT') && userClientId === (inv as any).clientId;
      if (!isInternalApprover && !isMatchingClient) throw new ForbiddenException('Not authorized to approve this invoice');
      if (inv.status !== 'SENT') throw new BadRequestException(`Cannot approve invoice in ${inv.status} status`);
    }

    return this.prisma.invoice.update({
      where: { id },
      data:  { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
      include: INVOICE_INCLUDE,
    });
  }

  async reject(id: number, userId: number, rejectionNote: string, userRoles: string[]) {
    const inv = await this.findOne(id);
    if (inv.invoiceType !== 'VENDOR') throw new BadRequestException('Only vendor invoices can be rejected');
    if (inv.status !== 'SUBMITTED')   throw new BadRequestException(`Cannot reject invoice in ${inv.status} status`);
    const allowed = userRoles.some(r => ['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER'].includes(r));
    if (!allowed) throw new ForbiddenException('Not authorized to reject vendor invoices');
    return this.prisma.invoice.update({
      where: { id },
      data:  { status: 'REJECTED', approvedById: userId, approvedAt: new Date(), rejectionNote },
      include: INVOICE_INCLUDE,
    });
  }

  // ── Request revision — set old to REVISION_REQUESTED, create new DRAFT ──────

  async requestRevision(id: number, userId: number, revisionNote: string) {
    const inv = await this.findOne(id);
    if (inv.status !== 'SUBMITTED') throw new BadRequestException('Can only request revision on SUBMITTED invoices');

    // Mark current invoice as revision requested
    await this.prisma.invoice.update({
      where: { id },
      data:  { status: 'REVISION_REQUESTED', rejectionNote: revisionNote },
    });

    // Unlock time entries so vendor can re-select them in the new draft
    const timeEntryIds = inv.lineItems
      .map((li: any) => li.timeEntryId)
      .filter(Boolean) as number[];

    if (timeEntryIds.length > 0) {
      await this.prisma.timeEntry.updateMany({
        where: { id: { in: timeEntryIds } },
        data:  { isBilled: false, isLocked: false },
      });
    }

    // Create a new DRAFT as a revision copy
    const newLineItems = inv.lineItems.map((li: any) => ({
      description:  li.description,
      quantity:     li.quantity,
      unitPrice:    li.unitPrice,
      amount:       li.amount,
      lineItemType: li.lineItemType,
      receiptNote:  li.receiptNote,
      taskId:       li.taskId,
      milestoneId:  li.milestoneId,
      // timeEntryId intentionally omitted — vendor picks fresh entries
    }));

    return this.prisma.invoice.create({
      data: {
        invoiceType:    inv.invoiceType,
        status:         'DRAFT',
        triggerType:    inv.triggerType,
        invoiceDate:    inv.invoiceDate,
        dueDate:        inv.dueDate,
        subtotal:       inv.subtotal,
        taxRate:        inv.taxRate,
        taxAmount:      inv.taxAmount,
        total:          inv.total,
        notes:          inv.notes,
        vendorId:       inv.vendorId,
        clientId:       inv.clientId,
        projectId:      inv.projectId,
        vendorQuoteId:  inv.vendorQuoteId,
        createdById:    userId,
        parentInvoiceId: id,
        version:        inv.version + 1,
        revisionNote,
        lineItems: { create: newLineItems },
      },
      include: INVOICE_INCLUDE,
    });
  }

  // ── Financials aggregate (PM/AM) ─────────────────────────────────────────────

  async getFinancials(filters: { projectId?: number; vendorId?: number; clientId?: number } = {}) {
    const projects = await this.prisma.project.findMany({
      where: {
        ...(filters.projectId ? { id: filters.projectId } : {}),
        status: { not: 'ARCHIVED' },
      },
      include: {
        client: { select: { currency: true } },
        invoices: {
          include: { payments: { select: { amount: true } } },
        },
        _count: { select: { invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const projectRows = projects.map(p => {
      const allInvoices = p.invoices.filter(inv => {
        if (filters.vendorId && inv.vendorId !== filters.vendorId) return false;
        if (filters.clientId && inv.clientId !== filters.clientId) return false;
        return true;
      });

      const invoiced   = allInvoices.reduce((s, inv) => s + Number(inv.total), 0);
      const paid       = allInvoices.reduce((s, inv) =>
        s + inv.payments.reduce((ps, p) => ps + Number(p.amount), 0), 0);
      const approved   = allInvoices
        .filter(inv => ['APPROVED', 'PAID'].includes(inv.status))
        .reduce((s, inv) => s + Number(inv.total), 0);
      const pending    = allInvoices
        .filter(inv => inv.status === 'SUBMITTED')
        .reduce((s, inv) => s + Number(inv.total), 0);

      // Use the most common currency in invoices, falling back to the client's, then USD
      const currencyCounts: Record<string, number> = {};
      for (const inv of allInvoices) {
        const c = (inv as any).currency ?? 'USD';
        currencyCounts[c] = (currencyCounts[c] ?? 0) + 1;
      }
      const currency = Object.keys(currencyCounts).sort((a, b) => currencyCounts[b] - currencyCounts[a])[0]
        ?? (p as any).client?.currency
        ?? 'USD';

      return {
        projectId:   p.id,
        projectName: p.name,
        billingMethod: p.billingMethod,
        currency,
        invoiced,
        approved,
        paid,
        outstanding: invoiced - paid,
        pending,
        invoiceCount: allInvoices.length,
      };
    });

    // Include standalone invoices (no project) when not filtering by project
    if (!filters.projectId) {
      const standaloneInvoices = await this.prisma.invoice.findMany({
        where: {
          projectId: null,
          ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
          ...(filters.clientId ? { clientId: filters.clientId } : {}),
        },
        include: { payments: { select: { amount: true } } },
      });

      if (standaloneInvoices.length > 0) {
        const invoiced = standaloneInvoices.reduce((s, inv) => s + Number(inv.total), 0);
        const paid     = standaloneInvoices.reduce((s, inv) =>
          s + inv.payments.reduce((ps, p) => ps + Number(p.amount), 0), 0);
        const approved = standaloneInvoices
          .filter(inv => ['APPROVED', 'PAID'].includes(inv.status))
          .reduce((s, inv) => s + Number(inv.total), 0);
        const pending  = standaloneInvoices
          .filter(inv => inv.status === 'SUBMITTED')
          .reduce((s, inv) => s + Number(inv.total), 0);

        projectRows.push({
          projectId:     null as any,
          projectName:   '(Standalone)',
          billingMethod: null as any,
          currency:      'USD',
          invoiced,
          approved,
          paid,
          outstanding:   invoiced - paid,
          pending,
          invoiceCount:  standaloneInvoices.length,
        });
      }
    }

    return projectRows;
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.invoice.delete({ where: { id } });
  }

  // ── Payments ─────────────────────────────────────────────────────────────────

  async addPayment(invoiceId: number, dto: { amount: number; paymentDate: string; paymentMethod: string; reference?: string }, userId: number) {
    const inv = await this.findOne(invoiceId);
    if (inv.status === 'DRAFT') throw new BadRequestException('Cannot record payment for a DRAFT invoice');

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId,
        amount:        dto.amount,
        paymentDate:   new Date(dto.paymentDate),
        paymentMethod: dto.paymentMethod,
        reference:     dto.reference,
        recordedById:  userId,
      },
      include: { recordedBy: { select: { id: true, name: true } } },
    });

    const payments   = await this.prisma.payment.findMany({ where: { invoiceId } });
    const totalPaid  = payments.reduce((s, p) => s + Number(p.amount), 0);
    if (totalPaid >= Number(inv.total)) {
      await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'PAID', paidAt: new Date() } });
    }

    return payment;
  }

  removePayment(id: number) {
    return this.prisma.payment.delete({ where: { id } });
  }
}
