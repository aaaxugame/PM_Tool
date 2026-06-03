import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(file: Express.Multer.File, userId: number, linkTo: {
    projectId?: number;
    invoiceId?: number;
    invoiceLineItemId?: number;
    milestoneId?: number;
  }) {
    const url = `/uploads/${file.filename}`;
    return this.prisma.document.create({
      data: {
        filename: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        url,
        uploadedById: userId,
        projectId: linkTo.projectId ?? null,
        invoiceId: linkTo.invoiceId ?? null,
        invoiceLineItemId: linkTo.invoiceLineItemId ?? null,
        milestoneId: linkTo.milestoneId ?? null,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
  }

  findByEntity(filter: {
    projectId?: number;
    invoiceId?: number;
    invoiceLineItemId?: number;
    milestoneId?: number;
  }) {
    return this.prisma.document.findMany({
      where: {
        projectId: filter.projectId ?? undefined,
        invoiceId: filter.invoiceId ?? undefined,
        invoiceLineItemId: filter.invoiceLineItemId ?? undefined,
        milestoneId: filter.milestoneId ?? undefined,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: number, userId: number) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.uploadedById !== userId) throw new ForbiddenException('Not your document');

    const filePath = path.join(process.cwd(), 'uploads', doc.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return this.prisma.document.delete({ where: { id } });
  }
}
