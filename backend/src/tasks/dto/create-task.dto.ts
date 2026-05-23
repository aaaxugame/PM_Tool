import { IsString, IsOptional, IsEnum, IsInt, IsDateString, IsBoolean, IsNumber } from 'class-validator';
import { TaskStatus, Priority } from '@prisma/client';

export class CreateTaskDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsInt()
  projectId: number;

  @IsInt()
  @IsOptional()
  milestoneId?: number;

  @IsInt()
  @IsOptional()
  assigneeId?: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @IsBoolean()
  @IsOptional()
  isBillable?: boolean;
}
