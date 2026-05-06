import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  type Profile,
  type VerifyCallback,
} from 'passport-google-oauth20';
import { AuthApplicationService } from '../../application/auth.application.service';
import type { Request } from 'express';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly authApplicationService: AuthApplicationService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const primaryEmail = profile.emails?.[0]?.value;
    if (!primaryEmail) {
      done(new Error('Google account has no email'));
      return;
    }
    const avatarUrl = profile.photos?.[0]?.value ?? null;
    const auth = await this.authApplicationService.loginWithGoogle(
      {
        googleId: profile.id,
        email: primaryEmail,
        displayName: profile.displayName || 'Player',
        avatarUrl,
      },
      {
        ip: request.ip ?? null,
        userAgent:
          typeof request.headers['user-agent'] === 'string'
            ? request.headers['user-agent']
            : null,
      },
    );
    done(null, auth);
  }
}
