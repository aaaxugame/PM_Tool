import { IsString, IsOptional, IsEnum, IsInt, IsDateString, IsDecimal } from 'class-validator';
import { ProjectStatus, BillingMethod, Priority, ProjectApproval } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsEnum(ProjectApproval)
  @IsOptional()
  approvalStatus?: ProjectApproval;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsEnum(BillingMethod)
  @IsOptional()
  billingMethod?: BillingMethod;

  @IsInt()
  clientId: number;

  @IsInt()
  @IsOptional()
  pmId?: number;

  @IsInt()
  @IsOptional()
  amId?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsDecimal()
  @IsOptional()
  proposedCost?: string;

  @IsDecimal()
  @IsOptional()
  estimatedHours?: string;

  @IsInt()
  @IsOptional()
  proposedWorkers?: number;

  @IsDecimal()
  @IsOptional()
  hourlyRate?: string;
}
