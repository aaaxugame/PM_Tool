import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const USER_INCLUDE = {
  userRoles: { include: { role: true } },
  vendor: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: USER_INCLUDE,
    });
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
      include: USER_INCLUDE,
    });
  }

  async createLocal(email: string, name: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { email, name, passwordHash, authProvider: 'LOCAL' },
      include: USER_INCLUDE,
    });
  }

  async createFromGoogle(email: string, name: string, googleId: string) {
    return this.prisma.user.upsert({
      where: { googleId },
      update: {},
      create: { email, name, googleId, authProvider: 'GOOGLE' },
      include: USER_INCLUDE,
    });
  }

  async validatePassword(user: any, password: string) {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  }

  async updateProfile(id: number, data: { name?: string; email?: string; newPassword?: string; currentPassword?: string; jobTitle?: string }) {
    const user = await this.findById(id);

    if (data.newPassword) {
      if (user.authProvider === 'GOOGLE') throw new Error('Google accounts cannot set a password');
      if (!data.currentPassword) throw new Error('Current password is required');
      const valid = await bcrypt.compare(data.currentPassword, user.passwordHash ?? '');
      if (!valid) throw new Error('Current password is incorrect');
    }

    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new Error('Email already in use');
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.newPassword) updateData.passwordHash = await bcrypt.hash(data.newPassword, 10);
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: USER_INCLUDE,
    });
    return this.formatUser(updated);
  }

  formatUser(user: any) {
    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      roles: user.userRoles?.map((ur: any) => ur.role.name) ?? [],
    };
  }
}
