import { IsInt, IsNumber, IsDateString, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  invoiceId?: number;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @IsDateString()
  paymentDate: string;

  @IsString()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  reference?: string;
}
