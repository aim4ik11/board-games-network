import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  AuthUser,
  PublicProfileSummary,
  PublicUserCard,
} from '@boardgame/shared';
import { BcryptPasswordHasher } from '../infrastructure/crypto/bcrypt-password-hasher';
import { JwtAccessTokenIssuer } from '../infrastructure/jwt/jwt-access-token-issuer';
import { PrismaAuthSessionsRepository } from '../infrastructure/persistence/prisma-auth-sessions.repository';
import { PrismaAuthUsersRepository } from '../infrastructure/persistence/prisma-auth-users.repository';
import { RefreshTokenService } from '../infrastructure/tokens/refresh-token.service';
import { MediaApplicationService } from '../../media/application/media.application.service';

export type RegisterUserProps = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginUserProps = {
  email: string;
  password: string;
};

type AuthRequestMeta = {
  ip: string | null;
  userAgent: string | null;
};

export type LoginWithGoogleProps = {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

@Injectable()
export class AuthApplicationService {
  private readonly logger = new Logger(AuthApplicationService.name);

  constructor(
    private readonly authUsersRepository: PrismaAuthUsersRepository,
    private readonly authSessionsRepository: PrismaAuthSessionsRepository,
    private readonly passwordHasher: BcryptPasswordHasher,
    private readonly accessTokenIssuer: JwtAccessTokenIssuer,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly mediaApplicationService: MediaApplicationService,
  ) {}

  async register(props: RegisterUserProps, requestMeta: AuthRequestMeta) {
    const email = props.email.toLowerCase();
    const exists = await this.authUsersRepository.existsByEmail(email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await this.passwordHasher.hash(props.password);
    const avatarUrl = this.mediaApplicationService.getDefaultAvatarUrl(email);
    const user = await this.authUsersRepository.createRegisteredUser({
      email,
      passwordHash,
      displayName: props.displayName.trim(),
      avatarUrl,
    });
    return this.createLoginResponse(user, requestMeta);
  }

  async login(props: LoginUserProps, requestMeta: AuthRequestMeta) {
    const email = props.email.toLowerCase();
    const row =
      await this.authUsersRepository.findWithCredentialsByEmail(email);
    if (!row) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await this.passwordHasher.verify(
      props.password,
      row.passwordHash,
    );
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const { passwordHash, ...user } = row;
    if (row.googleId !== null) {
      throw new UnauthorizedException('Use Google sign-in for this account');
    }
    void passwordHash;
    return this.createLoginResponse(user, requestMeta);
  }

  async loginWithGoogle(
    props: LoginWithGoogleProps,
    requestMeta: AuthRequestMeta,
  ) {
    const email = props.email.toLowerCase();
    const normalizedGoogleAvatarUrl = this.normalizeGoogleAvatarUrl(
      props.avatarUrl,
    );
    let user = await this.authUsersRepository.findByGoogleId(props.googleId);
    if (
      user &&
      normalizedGoogleAvatarUrl &&
      user.avatarUrl !== normalizedGoogleAvatarUrl
    ) {
      user = await this.authUsersRepository.updateProfile(user.id, {
        avatarUrl: normalizedGoogleAvatarUrl,
      });
    }
    if (!user) {
      user = await this.authUsersRepository.linkGoogleAccountByEmail({
        email,
        googleId: props.googleId,
        avatarUrl: normalizedGoogleAvatarUrl,
      });
    }
    if (!user) {
      const passwordHash = await this.passwordHasher.hash(
        this.refreshTokenService.generateOpaqueToken(),
      );
      user = await this.authUsersRepository.createGoogleUser({
        email,
        googleId: props.googleId,
        displayName: props.displayName.trim() || 'Player',
        avatarUrl:
          normalizedGoogleAvatarUrl ??
          this.mediaApplicationService.getDefaultAvatarUrl(email),
        passwordHash,
      });
    }
    return this.createLoginResponse(user, requestMeta);
  }

  async refresh(refreshToken: string, requestMeta: AuthRequestMeta) {
    const parsed = this.parseStructuredToken(refreshToken);
    if (!parsed) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const currentSession = await this.authSessionsRepository.findSessionById(
      parsed.tokenId,
    );
    if (!currentSession) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (currentSession.revokedAt || currentSession.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    const tokenHash = this.refreshTokenService.hashToken(parsed.tokenSecret);
    if (currentSession.refreshTokenHash !== tokenHash) {
      await this.authSessionsRepository.revokeSessionFamily(
        currentSession.tokenFamily,
      );
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    const user = await this.authUsersRepository.findPublicProfileById(
      currentSession.userId,
    );
    if (!user) {
      throw new UnauthorizedException();
    }

    const nextTokenSecret = this.refreshTokenService.generateOpaqueToken();
    const nextSession = await this.authSessionsRepository.createSession({
      userId: user.id,
      refreshTokenHash: this.refreshTokenService.hashToken(nextTokenSecret),
      tokenFamily: currentSession.tokenFamily,
      expiresAt: this.buildRefreshTokenExpiryDate(),
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    });
    await this.authSessionsRepository.rotateSession({
      sessionId: currentSession.id,
      nextSessionId: nextSession.id,
    });

    return {
      accessToken: this.accessTokenIssuer.issueAccessToken({
        sub: user.id,
        email: user.email,
        sid: nextSession.id,
      }),
      refreshToken: `${nextSession.id}.${nextTokenSecret}`,
      user,
    };
  }

  async logoutCurrent(accessTokenPayload: { sid?: string }): Promise<void> {
    if (!accessTokenPayload.sid) {
      return;
    }
    await this.authSessionsRepository.revokeSession(accessTokenPayload.sid);
  }

  logoutAll(userId: string): Promise<number> {
    return this.authSessionsRepository.revokeAllUserSessions(userId);
  }

  async forgotPassword(emailRaw: string, requestMeta: AuthRequestMeta) {
    const email = emailRaw.toLowerCase();
    const user = await this.authUsersRepository.findIdByEmail(email);
    if (!user) {
      return { ok: true as const };
    }

    const secret = this.refreshTokenService.generateOpaqueToken();
    const created = await this.authSessionsRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash: this.refreshTokenService.hashToken(secret),
      expiresAt: new Date(Date.now() + 1000 * 60 * 20),
      requestedIp: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    });
    const resetToken = `${created.id}.${secret}`;
    this.logger.log(
      `DEV password reset token for user ${user.id}: ${resetToken}`,
    );
    return { ok: true as const };
  }

  async resetPassword(token: string, nextPassword: string): Promise<void> {
    const parsed = this.parseStructuredToken(token);
    if (!parsed) {
      throw new UnauthorizedException('Invalid password reset token');
    }
    const row = await this.authSessionsRepository.findActiveResetTokenById(
      parsed.tokenId,
    );
    if (!row || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Password reset token expired');
    }
    const hash = this.refreshTokenService.hashToken(parsed.tokenSecret);
    if (hash !== row.tokenHash) {
      throw new UnauthorizedException('Invalid password reset token');
    }

    const passwordHash = await this.passwordHasher.hash(nextPassword);
    await this.authUsersRepository.updatePasswordHash(row.userId, passwordHash);
    await this.authSessionsRepository.markPasswordResetTokenUsed(row.id);
    await this.authSessionsRepository.revokeAllUserSessions(row.userId);
  }

  me(user: AuthUser) {
    return user;
  }

  async getPublicProfile(userId: string): Promise<PublicUserCard> {
    const card = await this.authUsersRepository.findUserCardById(userId);
    if (!card) {
      throw new NotFoundException('User not found');
    }
    return card;
  }

  async getPublicProfileSummary(userId: string): Promise<PublicProfileSummary> {
    const summary =
      await this.authUsersRepository.findPublicProfileSummaryById(userId);
    if (!summary) {
      throw new NotFoundException('User not found');
    }
    return summary;
  }

  findPublicProfileById(userId: string): Promise<AuthUser | null> {
    return this.authUsersRepository.findPublicProfileById(userId);
  }

  findPublicUserCardById(userId: string): Promise<PublicUserCard | null> {
    return this.authUsersRepository.findUserCardById(userId);
  }

  searchPublicUserCards(params: {
    q: string;
    city?: string;
    excludeUserId: string;
    skip: number;
    take: number;
  }): Promise<{ items: PublicUserCard[]; total: number }> {
    return this.authUsersRepository.searchPublicUserCards(params);
  }

  async updateMyProfile(
    user: AuthUser,
    patch: {
      displayName?: string;
      bio?: string;
      city?: string;
      avatarUrl?: string;
    },
  ): Promise<AuthUser> {
    const data = {
      ...(patch.displayName !== undefined && {
        displayName: patch.displayName.trim(),
      }),
      ...(patch.bio !== undefined && {
        bio: patch.bio.trim() === '' ? null : patch.bio.trim(),
      }),
      ...(patch.city !== undefined && {
        city: patch.city.trim() === '' ? null : patch.city.trim(),
      }),
      ...(patch.avatarUrl !== undefined && {
        avatarUrl:
          patch.avatarUrl.trim() === '' ? null : patch.avatarUrl.trim(),
      }),
    };
    if (Object.keys(data).length === 0) {
      return user;
    }
    return this.authUsersRepository.updateProfile(user.id, data);
  }

  private async createLoginResponse(
    user: AuthUser,
    requestMeta: AuthRequestMeta,
  ) {
    const tokenFamily = this.refreshTokenService.generateTokenFamily();
    const tokenSecret = this.refreshTokenService.generateOpaqueToken();
    const session = await this.authSessionsRepository.createSession({
      userId: user.id,
      refreshTokenHash: this.refreshTokenService.hashToken(tokenSecret),
      tokenFamily,
      expiresAt: this.buildRefreshTokenExpiryDate(),
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    });

    return {
      accessToken: this.accessTokenIssuer.issueAccessToken({
        sub: user.id,
        email: user.email,
        sid: session.id,
      }),
      refreshToken: `${session.id}.${tokenSecret}`,
      user,
    };
  }

  private buildRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  }

  private parseStructuredToken(
    token: string,
  ): { tokenId: string; tokenSecret: string } | null {
    const [tokenId, tokenSecret] = token.split('.');
    if (!tokenId || !tokenSecret) {
      return null;
    }
    return { tokenId, tokenSecret };
  }

  private normalizeGoogleAvatarUrl(url: string | null): string | null {
    if (!url) {
      return null;
    }
    const trimmed = url.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const withProtocol = trimmed.startsWith('//')
      ? `https:${trimmed}`
      : trimmed;
    try {
      const parsed = new URL(withProtocol);
      const isGoogleHost =
        parsed.hostname.endsWith('googleusercontent.com') ||
        parsed.hostname.endsWith('ggpht.com');
      if (!isGoogleHost) {
        return withProtocol;
      }
      parsed.protocol = 'https:';
      return parsed.toString();
    } catch {
      return null;
    }
  }
}
