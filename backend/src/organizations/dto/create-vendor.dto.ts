import { IsString, IsEmail, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVendorDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  defaultHourlyRate?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
