import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  private issueTokens(userId: number) {
    const payload = { sub: userId };
    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '1h',
    });
    const refresh_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
    return { access_token, refresh_token };
  }

  setAuthCookies(res: Response, access_token: string, refresh_token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', access_token, { httpOnly: true, sameSite: 'lax', secure: isProd });
    res.cookie('refresh_token', refresh_token, { httpOnly: true, sameSite: 'lax', secure: isProd });
  }

  clearAuthCookies(res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }

  async register(dto: RegisterDto, res: Response) {
    const user = await this.usersService.createLocal(dto.email, dto.name, dto.password);
    const tokens = this.issueTokens(user.id);
    this.setAuthCookies(res, tokens.access_token, tokens.refresh_token);
    return this.usersService.formatUser(user);
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await this.usersService.validatePassword(user, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');
    const tokens = this.issueTokens(user.id);
    this.setAuthCookies(res, tokens.access_token, tokens.refresh_token);
    return this.usersService.formatUser(user);
  }

  async loginWithGoogle(user: any, res: Response) {
    const tokens = this.issueTokens(user.id);
    this.setAuthCookies(res, tokens.access_token, tokens.refresh_token);
    return user;
  }
}
