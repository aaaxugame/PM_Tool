import { Module } from '@nestjs/common';
import { VendorQuotesController } from './vendor-quotes.controller';
import { VendorQuotesService } from './vendor-quotes.service';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';

@Module({
  controllers: [VendorQuotesController, BudgetsController],
  providers: [VendorQuotesService, BudgetsService],
  exports: [VendorQuotesService, BudgetsService],
})
export class QuotesBudgetsModule {}
