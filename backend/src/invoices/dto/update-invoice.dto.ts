import { IsOptional, IsEnum, IsDateString, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';

export class UpdateInvoiceDto {
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  taxRate?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
