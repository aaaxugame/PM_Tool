import { IsString, IsEmail, IsOptional, IsBoolean, IsInt, IsArray } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsInt()
  @IsOptional()
  vendorId?: number;

  @IsInt()
  @IsOptional()
  clientId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsArray()
  @IsOptional()
  roles?: string[];
}
