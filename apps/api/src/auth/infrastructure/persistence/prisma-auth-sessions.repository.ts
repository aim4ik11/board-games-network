import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  AuthSessionRecord,
  CreateAuthSessionInput,
  CreatePasswordResetTokenInput,
  PasswordResetTokenRecord,
} from '../../domain/types/auth-session.types';

@Injectable()
export class PrismaAuthSessionsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createSession(input: CreateAuthSessionInput): Promise<AuthSessionRecord> {
    return this.prismaService.authSession.create({
      data: {
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        tokenFamily: input.tokenFamily,
        expiresAt: input.expiresAt,
        ip: input.ip,
        userAgent: input.userAgent,
      },
      select: {
        id: true,
        userId: true,
        refreshTokenHash: true,
        tokenFamily: true,
        expiresAt: true,
        revokedAt: true,
        replacedBySessionId: true,
      },
    });
  }

  findSessionById(sessionId: string): Promise<AuthSessionRecord | null> {
    return this.prismaService.authSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        refreshTokenHash: true,
        tokenFamily: true,
        expiresAt: true,
        revokedAt: true,
        replacedBySessionId: true,
      },
    });
  }

  async rotateSession(params: {
    sessionId: string;
    nextSessionId: string;
  }): Promise<void> {
    await this.prismaService.authSession.update({
      where: { id: params.sessionId },
      data: {
        revokedAt: new Date(),
        replacedBySessionId: params.nextSessionId,
      },
    });
  }

  revokeSession(sessionId: string): Promise<void> {
    return this.prismaService.authSession
      .update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      })
      .then(() => undefined);
  }

  revokeSessionFamily(tokenFamily: string): Promise<number> {
    return this.prismaService.authSession
      .updateMany({
        where: { tokenFamily, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .then((result) => result.count);
  }

  revokeAllUserSessions(userId: string): Promise<number> {
    return this.prismaService.authSession
      .updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .then((result) => result.count);
  }

  createPasswordResetToken(
    input: CreatePasswordResetTokenInput,
  ): Promise<PasswordResetTokenRecord> {
    return this.prismaService.passwordResetToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        requestedIp: input.requestedIp,
        userAgent: input.userAgent,
      },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        usedAt: true,
      },
    });
  }

  findActiveResetTokenById(
    tokenId: string,
  ): Promise<PasswordResetTokenRecord | null> {
    return this.prismaService.passwordResetToken.findFirst({
      where: {
        id: tokenId,
        usedAt: null,
      },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        usedAt: true,
      },
    });
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<void> {
    await this.prismaService.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  deleteExpiredResetTokens(now: Date): Promise<number> {
    return this.prismaService.passwordResetToken
      .deleteMany({
        where: {
          OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
        },
      })
      .then((result) => result.count);
  }
}
