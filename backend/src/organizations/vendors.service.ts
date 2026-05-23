import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.vendor.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  create(dto: CreateVendorDto) {
    return this.prisma.vendor.create({ data: dto });
  }

  async update(id: number, dto: UpdateVendorDto) {
    await this.findOne(id);
    return this.prisma.vendor.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.vendor.delete({ where: { id } });
  }
}
