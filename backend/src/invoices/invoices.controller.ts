import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceStatus } from '@prisma/client';

@Controller('invoices')
@UseGuards(AuthGuard('jwt'))
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  findAll(
    @Query('clientId') clientId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.invoicesService.findAll({
      clientId: clientId ? Number(clientId) : undefined,
      projectId: projectId ? Number(projectId) : undefined,
      status,
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
