import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorQuoteDto } from './dto/create-vendor-quote.dto';
import { UpdateVendorQuoteDto } from './dto/update-vendor-quote.dto';
import { QuoteStatus } from '@prisma/client';

@Injectable()
export class VendorQuotesService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: { projectId?: number; vendorId?: number; status?: QuoteStatus } = {}) {
    const where: any = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.vendorId) where.vendorId = filters.vendorId;
    if (filters.status) where.status = filters.status;
    return this.prisma.vendorQuote.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const q = await this.prisma.vendorQuote.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });
    if (!q) throw new NotFoundException(`Vendor quote ${id} not found`);
    return q;
  }

  create(dto: CreateVendorQuoteDto, userId: number) {
    const { expiryDate, quotedPrice, estimatedHours, ...rest } = dto;
    return this.prisma.vendorQuote.create({
      data: {
        ...rest,
        quotedPrice,
        estimatedHours: estimatedHours ?? undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        submittedById: userId,
      },
      include: {
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: number, dto: UpdateVendorQuoteDto, userId: number) {
    const quote = await this.findOne(id);

    const VALID_TRANSITIONS: Partial<Record<QuoteStatus, QuoteStatus[]>> = {
      PENDING: ['SUBMITTED'],
      SUBMITTED: ['APPROVED', 'REJECTED'],
      REJECTED: ['PENDING'],
    };

    if (dto.status && dto.status !== quote.status) {
      const allowed = VALID_TRANSITIONS[quote.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(`Cannot transition from ${quote.status} to ${dto.status}`);
      }
    }

    const { expiryDate, ...rest } = dto;
    const data: any = { ...rest };
    if (expiryDate) data.expiryDate = new Date(expiryDate);

    if (dto.status === 'APPROVED' || dto.status === 'REJECTED') {
      data.reviewedById = userId;
      data.reviewedAt = new Date();
    }
    if (dto.status === 'PENDING' && quote.status === 'REJECTED') {
      data.version = quote.version + 1;
      data.rejectionReason = null;
      data.reviewedAt = null;
      data.reviewedById = null;
    }

    return this.prisma.vendorQuote.update({
      where: { id },
      data,
      include: {
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: number) {
    const quote = await this.findOne(id);
    if (quote.status === 'APPROVED') {
      throw new BadRequestException('Approved quotes cannot be deleted.');
    }
    // Disconnect any invoices referencing this quote before deleting
    await this.prisma.invoice.updateMany({
      where: { vendorQuoteId: id },
      data: { vendorQuoteId: null },
    });
    return this.prisma.vendorQuote.delete({ where: { id } });
  }
}
