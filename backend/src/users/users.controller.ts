import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersAdminService } from './users-admin.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private usersAdminService: UsersAdminService) {}

  @Get()
  findAll() {
    return this.usersAdminService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersAdminService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersAdminService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateUserDto>) {
    return this.usersAdminService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersAdminService.remove(id);
  }

  @Post(':id/roles')
  assignRoles(@Param('id', ParseIntPipe) id: number, @Body('roles') roles: string[]) {
    return this.usersAdminService.assignRoles(id, roles);
  }
}
