import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

const USER_INCLUDE = { userRoles: { include: { role: true } }, vendor: true, client: true };

@Injectable()
export class UsersAdminService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: USER_INCLUDE,
      orderBy: { name: 'asc' },
    });
    return users.map(this.format);
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
    if (!user) throw new NotFoundException('User not found');
    return this.format(user);
  }

  async create(dto: CreateUserDto) {
    const { roles, password, ...data } = dto;
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    const user = await this.prisma.user.create({
      data: { ...data, passwordHash, authProvider: password ? 'LOCAL' : 'GOOGLE' },
      include: USER_INCLUDE,
    });
    if (roles?.length) await this.assignRoles(user.id, roles);
    return this.format(await this.prisma.user.findUnique({ where: { id: user.id }, include: USER_INCLUDE }));
  }

  async update(id: number, dto: Partial<CreateUserDto>) {
    await this.findOne(id);
    const { roles, password, ...data } = dto;
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    const updateData = passwordHash ? { ...data, passwordHash } : data;
    await this.prisma.user.update({ where: { id }, data: updateData });
    if (roles) await this.assignRoles(id, roles);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }

  async assignRoles(userId: number, roleNames: string[]) {
    await this.prisma.userRole.deleteMany({ where: { userId } });
    const roles = await this.prisma.role.findMany({ where: { name: { in: roleNames as any } } });
    await this.prisma.userRole.createMany({
      data: roles.map(role => ({ userId, roleId: role.id })),
    });
  }

  private format(user: any) {
    const { passwordHash, ...rest } = user;
    return { ...rest, roles: user.userRoles?.map((ur: any) => ur.role.name) ?? [] };
  }
}
