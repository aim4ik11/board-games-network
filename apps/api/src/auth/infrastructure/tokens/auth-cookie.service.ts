import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

export const REFRESH_COOKIE_NAME = 'bg_refresh_token';

@Injectable()
export class AuthCookieService {
  constructor(private readonly configService: ConfigService) {}

  setRefreshTokenCookie(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.isSecureCookie(),
      sameSite: 'lax',
      path: '/auth',
      maxAge: this.getRefreshTokenExpiresSeconds() * 1000,
    });
  }

  clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.isSecureCookie(),
      sameSite: 'lax',
      path: '/auth',
    });
  }

  getRefreshTokenExpiresSeconds(): number {
    const configured = Number(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_SEC', '1209600'),
    );
    if (!Number.isFinite(configured) || configured <= 0) {
      return 1209600;
    }
    return configured;
  }

  private isSecureCookie(): boolean {
    const forceSecure = this.configService.get<string>(
      'JWT_REFRESH_COOKIE_SECURE',
      'false',
    );
    if (forceSecure === 'true') {
      return true;
    }
    return this.configService.get<string>('NODE_ENV') === 'production';
  }
}
