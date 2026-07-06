import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean, IsDecimal } from 'class-validator';
import { MilestoneStatus } from '@prisma/client';

export class CreateMilestoneDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsEnum(MilestoneStatus)
  @IsOptional()
  status?: MilestoneStatus;

  @IsBoolean()
  @IsOptional()
  triggersInvoice?: boolean;

  @IsDecimal()
  @IsOptional()
  amount?: string;
}
