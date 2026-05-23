import { PartialType } from '@nestjs/mapped-types';
import { CreateVendorQuoteDto } from './create-vendor-quote.dto';

export class UpdateVendorQuoteDto extends PartialType(CreateVendorQuoteDto) {}
