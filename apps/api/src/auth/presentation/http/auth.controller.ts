import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthApplicationService } from '../../application/auth.application.service';
import {
  AuthCookieService,
  REFRESH_COOKIE_NAME,
} from '../../infrastructure/tokens/auth-cookie.service';
import {
  CurrentUser,
  type AuthUser,
} from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { Request, Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authApplicationService: AuthApplicationService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth(): void {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(
    @Req()
    request: Request & {
      user?: { accessToken: string; refreshToken: string; user: AuthUser };
    },
    @Res() response: Response,
  ) {
    const auth = request.user;
    if (!auth) {
      throw new UnauthorizedException('Google authentication failed');
    }
    this.authCookieService.setRefreshTokenCookie(response, auth.refreshToken);
    const webOrigin = process.env.WEB_ORIGIN?.split(',')[0]?.trim();
    const target = webOrigin && webOrigin.length > 0 ? webOrigin : '/';
    response.redirect(target);
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const auth = await this.authApplicationService.register(
      {
        email: dto.email,
        password: dto.password,
        displayName: dto.displayName,
      },
      this.getRequestMeta(request),
    );
    this.authCookieService.setRefreshTokenCookie(response, auth.refreshToken);
    return { accessToken: auth.accessToken, user: auth.user };
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const auth = await this.authApplicationService.login(
      {
        email: dto.email,
        password: dto.password,
      },
      this.getRequestMeta(request),
    );
    this.authCookieService.setRefreshTokenCookie(response, auth.refreshToken);
    return { accessToken: auth.accessToken, user: auth.user };
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers('origin') origin?: string,
  ) {
    this.assertTrustedOrigin(origin);
    const token = this.extractRefreshToken(request);
    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const auth = await this.authApplicationService.refresh(
      token,
      this.getRequestMeta(request),
    );
    this.authCookieService.setRefreshTokenCookie(response, auth.refreshToken);
    return { accessToken: auth.accessToken };
  }

  private extractRefreshToken(request: Request): string | null {
    const cookiesUnknown = request.cookies as unknown;
    if (typeof cookiesUnknown !== 'object' || cookiesUnknown === null) {
      return null;
    }
    const record = cookiesUnknown as Record<string, unknown>;
    const value = record[REFRESH_COOKIE_NAME];
    return typeof value === 'string' ? value : null;
  }

  @Post('logout')
  async logout(
    @CurrentUser() user: AuthUser & { sid?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authApplicationService.logoutCurrent({ sid: user.sid });
    this.authCookieService.clearRefreshTokenCookie(response);
    return { ok: true, userId: user.id };
  }

  @Post('logout-all')
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authApplicationService.logoutAll(user.id);
    this.authCookieService.clearRefreshTokenCookie(response);
    return { ok: true };
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: Request) {
    return this.authApplicationService.forgotPassword(
      dto.email,
      this.getRequestMeta(request),
    );
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authApplicationService.resetPassword(dto.token, dto.password);
    return { ok: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Current user (full profile)' })
  me(@CurrentUser() user: AuthUser) {
    return this.authApplicationService.me(user);
  }

  @Patch('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update my profile' })
  patchMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.authApplicationService.updateMyProfile(user, dto);
  }

  private getRequestMeta(request: Request): {
    ip: string | null;
    userAgent: string | null;
  } {
    return {
      ip: request.ip ?? null,
      userAgent:
        typeof request.headers['user-agent'] === 'string'
          ? request.headers['user-agent']
          : null,
    };
  }

  private assertTrustedOrigin(origin?: string): void {
    if (!origin) {
      return;
    }
    const allowed = (process.env.WEB_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((entry) => entry.trim());
    if (!allowed.includes(origin)) {
      throw new UnauthorizedException('Untrusted origin');
    }
  }
}
