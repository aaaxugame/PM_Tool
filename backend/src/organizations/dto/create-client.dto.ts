import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class CreateClientDto {
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

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
