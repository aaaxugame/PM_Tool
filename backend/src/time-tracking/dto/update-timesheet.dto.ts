import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TimesheetStatus } from '@prisma/client';

export class UpdateTimesheetDto {
  @IsEnum(TimesheetStatus)
  @IsOptional()
  status?: TimesheetStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
