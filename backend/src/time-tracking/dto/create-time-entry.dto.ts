import { IsString, IsOptional, IsInt, IsBoolean, Matches } from 'class-validator';

export class CreateTimeEntryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:MM' })
  startTime: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:MM' })
  endTime: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  projectId: number;

  @IsInt()
  @IsOptional()
  taskId?: number;

  @IsInt()
  @IsOptional()
  timesheetId?: number;

  @IsBoolean()
  @IsOptional()
  isBillable?: boolean;
}
