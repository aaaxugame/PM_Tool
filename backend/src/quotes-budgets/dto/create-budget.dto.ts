import { IsNumber, IsOptional, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  projectId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  taskId?: number;
}
