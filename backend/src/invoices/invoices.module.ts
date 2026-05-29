import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, RolesGuard],
  exports: [InvoicesService],
})
export class InvoicesModule {}
