import { IsInt, IsOptional, IsEnum, IsDateString, IsString, IsNumber, IsArray, ValidateNested, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus, TriggerType, LineItemType } from '@prisma/client';

export class CreateLineItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice: number;

  @IsEnum(LineItemType)
  @IsOptional()
  lineItemType?: LineItemType;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  taskId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  milestoneId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  timeEntryId?: number;

  @IsString()
  @IsOptional()
  receiptNote?: string;

  // frontend hint: lock quantity/unitPrice in edit UI
  @IsBoolean()
  @IsOptional()
  locked?: boolean;
}

export class CreateInvoiceDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  clientId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  projectId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  milestoneId?: number;

  @IsEnum(TriggerType)
  @IsOptional()
  triggerType?: TriggerType;

  @IsDateString()
  invoiceDate: string;

  @IsDateString()
  dueDate: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  taxRate?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineItemDto)
  lineItems: CreateLineItemDto[];

  @IsEnum(['CLIENT', 'VENDOR'])
  @IsOptional()
  invoiceType?: 'CLIENT' | 'VENDOR';

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  vendorId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  vendorQuoteId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  parentInvoiceId?: number;
}
