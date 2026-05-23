import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VendorQuotesService } from './vendor-quotes.service';
import { CreateVendorQuoteDto } from './dto/create-vendor-quote.dto';
import { UpdateVendorQuoteDto } from './dto/update-vendor-quote.dto';
import { QuoteStatus } from '@prisma/client';

@Controller('vendor-quotes')
@UseGuards(AuthGuard('jwt'))
export class VendorQuotesController {
  constructor(private vendorQuotesService: VendorQuotesService) {}

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: QuoteStatus,
  ) {
    return this.vendorQuotesService.findAll({
      projectId: projectId ? Number(projectId) : undefined,
      vendorId: vendorId ? Number(vendorId) : undefined,
      status,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vendorQuotesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVendorQuoteDto, @Req() req: any) {
    return this.vendorQuotesService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVendorQuoteDto, @Req() req: any) {
    return this.vendorQuotesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vendorQuotesService.remove(id);
  }
}
