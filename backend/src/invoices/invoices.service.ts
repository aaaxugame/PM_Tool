import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceStatus, InvoiceType } from '@prisma/client';

const INVOICE_INCLUDE = {
  client: { select: { id: true, name: true } },
  vendor: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  milestone: { select: { id: true, name: true } },
  vendorQuote: { select: { id: true, quotedPrice: true, paymentMode: true } },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  lineItems: true,
  payments: {
    include: { recordedBy: { select: { id: true, name: true } } },
    orderBy: { paymentDate: 'desc' as const },
  },
};

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: { clientId?: number; projectId?: number; vendorId?: number; status?: InvoiceStatus; invoiceType?: InvoiceType } = {}) {
    const where: any = {};
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.vendorId) where.vendorId = filters.vendorId;
    if (filters.status) where.status = filters.status;
    if (filters.invoiceType) where.invoiceType = filters.invoiceType;
    return this.prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        _count: { select: { lineItems: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const inv = await this.prisma.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
    if (!inv) throw new NotFoundException(`Invoice ${id} not found`);
    return inv;
  }

  async create(dto: CreateInvoiceDto, userId: number) {
    const { lineItems, invoiceDate, dueDate, taxRate = 0, triggerType = 'MANUAL', invoiceType = 'CLIENT', clientId, vendorId, vendorQuoteId, ...rest } = dto;

    if (invoiceType === 'CLIENT' && !clientId) throw new BadRequestException('clientId is required for CLIENT invoices');
    if (invoiceType === 'VENDOR' && !vendorId) throw new BadRequestException('vendorId is required for VENDOR invoices');

    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    return this.prisma.invoice.create({
      data: {
        ...rest,
        invoiceType,
        triggerType,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        subtotal,
        taxRate,
        taxAmount,
        total,
        createdById: userId,
        ...(clientId ? { clientId } : {}),
        ...(vendorId ? { vendorId } : {}),
        ...(vendorQuoteId ? { vendorQuoteId } : {}),
        lineItems: {
          create: lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            taskId: item.taskId,
            milestoneId: item.milestoneId,
          })),
        },
      },
      include: INVOICE_INCLUDE,
    });
  }

  async update(id: number, dto: UpdateInvoiceDto) {
    const inv = await this.findOne(id);

    const VALID_TRANSITIONS: Partial<Record<InvoiceStatus, InvoiceStatus[]>> = {
      // Client invoice transitions
      DRAFT: ['SENT'],
      SENT: ['PAID', 'OVERDUE', 'APPROVED'],
      OVERDUE: ['PAID', 'SENT'],
      APPROVED: ['PAID'],
      // Vendor invoice transitions
      // DRAFT -> SUBMITTED handled by submit()
      // SUBMITTED -> APPROVED/REJECTED handled by approve()/reject()
      // REJECTED -> DRAFT for resubmit
      REJECTED: ['DRAFT'],
    };

    if (dto.status && dto.status !== inv.status) {
      const allowed = VALID_TRANSITIONS[inv.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(`Cannot transition from ${inv.status} to ${dto.status}`);
      }
    }

    const data: any = { ...dto };
    if (dto.invoiceDate) data.invoiceDate = new Date(dto.invoiceDate);
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    if (dto.status === 'SENT') data.sentAt = new Date();
    if (dto.status === 'PAID') data.paidAt = new Date();

    return this.prisma.invoice.update({ where: { id }, data, include: INVOICE_INCLUDE });
  }

  async submit(id: number, userId: number) {
    const inv = await this.findOne(id);
    if (inv.invoiceType !== 'VENDOR') throw new BadRequestException('Only vendor invoices can be submitted');
    if (inv.status !== 'DRAFT') throw new BadRequestException(`Cannot submit invoice in ${inv.status} status`);
    // Optionally verify the user is the vendor's user
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'SUBMITTED' },
      include: INVOICE_INCLUDE,
    });
  }

  async approve(id: number, userId: number) {
    const inv = await this.findOne(id);
    const allowedStatuses: InvoiceStatus[] = inv.invoiceType === 'VENDOR' ? ['SUBMITTED'] : ['SENT'];
    if (!allowedStatuses.includes(inv.status)) {
      throw new BadRequestException(`Cannot approve invoice in ${inv.status} status`);
    }
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
      include: INVOICE_INCLUDE,
    });
  }

  async reject(id: number, userId: number, rejectionNote: string) {
    const inv = await this.findOne(id);
    if (inv.invoiceType !== 'VENDOR') throw new BadRequestException('Only vendor invoices can be rejected');
    if (inv.status !== 'SUBMITTED') throw new BadRequestException(`Cannot reject invoice in ${inv.status} status`);
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'REJECTED', approvedById: userId, approvedAt: new Date(), rejectionNote },
      include: INVOICE_INCLUDE,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.invoice.delete({ where: { id } });
  }

  async addPayment(invoiceId: number, dto: { amount: number; paymentDate: string; paymentMethod: string; reference?: string }, userId: number) {
    const inv = await this.findOne(invoiceId);
    if (inv.status === 'DRAFT') throw new BadRequestException('Cannot record payment for a DRAFT invoice');

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId,
        amount: dto.amount,
        paymentDate: new Date(dto.paymentDate),
        paymentMethod: dto.paymentMethod,
        reference: dto.reference,
        recordedById: userId,
      },
      include: { recordedBy: { select: { id: true, name: true } } },
    });

    const payments = await this.prisma.payment.findMany({ where: { invoiceId } });
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    if (totalPaid >= Number(inv.total)) {
      await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'PAID', paidAt: new Date() } });
    }

    return payment;
  }

  removePayment(id: number) {
    return this.prisma.payment.delete({ where: { id } });
  }

  // ── Auto-generate vendor invoices ─────────────────────────────────────────

  async autoGenerateForMilestone(milestoneId: number, projectId: number) {
    const quotes = await this.prisma.vendorQuote.findMany({
      where: { milestoneId, status: 'APPROVED', paymentMode: 'MILESTONE' },
      include: { vendor: true, milestone: true },
    });

    const milestone = await this.prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) return;

    const created: any[] = [];
    for (const quote of quotes) {
      const hours = Number(quote.estimatedHours ?? 0);
      const rate = Number(quote.hourlyRate ?? 0);
      const amount = rate > 0 && hours > 0 ? hours * rate : Number(quote.quotedPrice);
      const today = new Date();
      const due = new Date(today); due.setDate(due.getDate() + 30);

      const inv = await this.prisma.invoice.create({
        data: {
          invoiceType: 'VENDOR',
          status: 'DRAFT',
          triggerType: 'MILESTONE',
          invoiceDate: today,
          dueDate: due,
          subtotal: amount,
          taxRate: 0,
          taxAmount: 0,
          total: amount,
          vendorId: quote.vendorId,
          vendorQuoteId: quote.id,
          projectId,
          milestoneId,
          createdById: quote.submittedById,
          lineItems: {
            create: [{
              description: `${milestone.name} — ${quote.vendor.name}`,
              quantity: hours || 1,
              unitPrice: rate || amount,
              amount,
              milestoneId,
            }],
          },
        },
      });
      created.push(inv);
    }
    return created;
  }

  async autoGenerateForTask(taskId: number, projectId: number) {
    const quotes = await this.prisma.vendorQuote.findMany({
      where: { taskId, status: 'APPROVED', paymentMode: 'TASK' },
      include: { vendor: true, task: true },
    });

    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return;

    const created: any[] = [];
    for (const quote of quotes) {
      const hours = Number(quote.estimatedHours ?? 0);
      const rate = Number(quote.hourlyRate ?? 0);
      const amount = rate > 0 && hours > 0 ? hours * rate : Number(quote.quotedPrice);
      const today = new Date();
      const due = new Date(today); due.setDate(due.getDate() + 30);

      const inv = await this.prisma.invoice.create({
        data: {
          invoiceType: 'VENDOR',
          status: 'DRAFT',
          triggerType: 'MANUAL',
          invoiceDate: today,
          dueDate: due,
          subtotal: amount,
          taxRate: 0,
          taxAmount: 0,
          total: amount,
          vendorId: quote.vendorId,
          vendorQuoteId: quote.id,
          projectId,
          createdById: quote.submittedById,
          lineItems: {
            create: [{
              description: `${task.name} — ${quote.vendor.name}`,
              quantity: hours || 1,
              unitPrice: rate || amount,
              amount,
              taskId,
            }],
          },
        },
      });
      created.push(inv);
    }
    return created;
  }
}
