import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private usersService: UsersService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'GOOGLE_NOT_CONFIGURED',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_NOT_CONFIGURED',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: any, done: VerifyCallback) {
    const { emails, displayName, id } = profile;
    const email = emails[0].value;
    const user = await this.usersService.createFromGoogle(email, displayName, id);
    done(null, this.usersService.formatUser(user));
  }
}
