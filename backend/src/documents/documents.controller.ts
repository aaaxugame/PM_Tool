import {
  Controller, Post, Get, Delete, Param, Query, Req,
  UseGuards, UseInterceptors, UploadedFile, ParseIntPipe, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];

const storage = diskStorage({
  destination: join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`File type ${file.mimetype} not allowed`), false);
      }
    },
  }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Query('projectId') projectId?: string,
    @Query('invoiceId') invoiceId?: string,
    @Query('invoiceLineItemId') invoiceLineItemId?: string,
    @Query('milestoneId') milestoneId?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.documentsService.create(file, req.user.id, {
      projectId: projectId ? parseInt(projectId, 10) : undefined,
      invoiceId: invoiceId ? parseInt(invoiceId, 10) : undefined,
      invoiceLineItemId: invoiceLineItemId ? parseInt(invoiceLineItemId, 10) : undefined,
      milestoneId: milestoneId ? parseInt(milestoneId, 10) : undefined,
    });
  }

  @Get()
  list(
    @Query('projectId') projectId?: string,
    @Query('invoiceId') invoiceId?: string,
    @Query('invoiceLineItemId') invoiceLineItemId?: string,
    @Query('milestoneId') milestoneId?: string,
  ) {
    return this.documentsService.findByEntity({
      projectId: projectId ? parseInt(projectId, 10) : undefined,
      invoiceId: invoiceId ? parseInt(invoiceId, 10) : undefined,
      invoiceLineItemId: invoiceLineItemId ? parseInt(invoiceLineItemId, 10) : undefined,
      milestoneId: milestoneId ? parseInt(milestoneId, 10) : undefined,
    });
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.documentsService.remove(id, req.user.id);
  }
}
