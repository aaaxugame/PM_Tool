import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceStatus } from '@prisma/client';

const INVOICE_INCLUDE = {
  client: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  milestone: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  lineItems: true,
  payments: {
    include: { recordedBy: { select: { id: true, name: true } } },
    orderBy: { paymentDate: 'desc' as const },
  },
};

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: { clientId?: number; projectId?: number; status?: InvoiceStatus } = {}) {
    const where: any = {};
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.status) where.status = filters.status;
    return this.prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
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
    const { lineItems, invoiceDate, dueDate, taxRate = 0, triggerType = 'MANUAL', ...rest } = dto;

    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    return this.prisma.invoice.create({
      data: {
        ...rest,
        triggerType,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        subtotal,
        taxRate,
        taxAmount,
        total,
        createdById: userId,
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
      DRAFT: ['SENT', 'OVERDUE'],
      SENT: ['PAID', 'OVERDUE'],
      OVERDUE: ['PAID', 'SENT'],
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

    // Auto-mark as PAID if total payments >= invoice total
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
}
