import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Controller('organizations/vendors')
@UseGuards(AuthGuard('jwt'))
export class VendorsController {
  constructor(private vendorsService: VendorsService) {}

  @Get()
  findAll() {
    return this.vendorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVendorDto) {
    return this.vendorsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.remove(id);
  }
}
