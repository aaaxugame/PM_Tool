import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  controllers: [ClientsController, VendorsController],
  providers: [ClientsService, VendorsService],
  exports: [ClientsService, VendorsService],
})
export class OrganizationsModule {}
