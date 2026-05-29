import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceStatus, InvoiceType } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('invoices')
@UseGuards(AuthGuard('jwt'))
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  findAll(
    @Query('clientId') clientId?: string,
    @Query('projectId') projectId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('invoiceType') invoiceType?: InvoiceType,
  ) {
    return this.invoicesService.findAll({
      clientId: clientId ? Number(clientId) : undefined,
      projectId: projectId ? Number(projectId) : undefined,
      vendorId: vendorId ? Number(vendorId) : undefined,
      status,
      invoiceType,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    return this.invoicesService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.remove(id);
  }

  @Post(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.invoicesService.submit(id, req.user.id);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'CLIENT')
  approve(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.invoicesService.approve(id, req.user.id);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('rejectionNote') rejectionNote: string,
    @Req() req: any,
  ) {
    return this.invoicesService.reject(id, req.user.id, rejectionNote);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaymentDto,
    @Req() req: any,
  ) {
    const { invoiceId: _ignored, ...payData } = dto;
    return this.invoicesService.addPayment(id, payData, req.user.id);
  }

  @Delete('payments/:paymentId')
  removePayment(@Param('paymentId', ParseIntPipe) paymentId: number) {
    return this.invoicesService.removePayment(paymentId);
  }
}
