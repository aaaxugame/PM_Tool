import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ChangeRequestMilestoneDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;
}

export class CreateChangeRequestDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costDelta: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChangeRequestMilestoneDto)
  milestones?: ChangeRequestMilestoneDto[];

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  supersedesId?: number;
}
