import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersAdminService } from './users-admin.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersAdminService],
  exports: [UsersService, UsersAdminService],
})
export class UsersModule {}
