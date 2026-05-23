import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async createLocal(email: string, name: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { email, name, passwordHash, authProvider: 'LOCAL' },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async createFromGoogle(email: string, name: string, googleId: string) {
    return this.prisma.user.upsert({
      where: { googleId },
      update: {},
      create: { email, name, googleId, authProvider: 'GOOGLE' },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async validatePassword(user: any, password: string) {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  }

  formatUser(user: any) {
    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      roles: user.userRoles?.map((ur: any) => ur.role.name) ?? [],
    };
  }
}
