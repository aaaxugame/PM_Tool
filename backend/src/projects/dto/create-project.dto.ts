import { IsString, IsOptional, IsEnum, IsInt, IsDateString, IsDecimal } from 'class-validator';
import { ProjectStatus, BillingMethod, Priority, ProjectApproval, RiskLevel } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

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

  @IsEnum(RiskLevel)
  @IsOptional()
  riskLevel?: RiskLevel;

  @IsInt()
  @IsOptional()
  clientId?: number;

  @IsInt()
  @IsOptional()
  pmId?: number;

  @IsInt()
  @IsOptional()
  amId?: number;

  @IsInt()
  @IsOptional()
  requestingVendorId?: number;

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

  @IsString()
  @IsOptional()
  requiredSkillSet?: string;

  @IsDecimal()
  @IsOptional()
  hourlyRate?: string;
}
