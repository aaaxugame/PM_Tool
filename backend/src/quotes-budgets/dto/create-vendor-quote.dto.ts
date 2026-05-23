import { IsNumber, IsOptional, IsInt, IsEnum, IsDateString, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { QuoteStatus } from '@prisma/client';

export class CreateVendorQuoteDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quotedPrice: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  estimatedHours?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  peopleCount?: number;

  @IsEnum(QuoteStatus)
  @IsOptional()
  status?: QuoteStatus;

  @IsInt()
  @Type(() => Number)
  vendorId: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  projectId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  taskId?: number;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
