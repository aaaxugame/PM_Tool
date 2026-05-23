import { IsString, IsOptional, IsEnum, IsInt, IsDateString, IsBoolean } from 'class-validator';
import { ProjectStatus, BillingMethod } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsEnum(BillingMethod)
  @IsOptional()
  billingMethod?: BillingMethod;

  @IsInt()
  clientId: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
