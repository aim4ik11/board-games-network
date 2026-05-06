import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '@boardgame/shared';
import type { Socket } from 'socket.io';
import { PrismaAuthUsersRepository } from '../infrastructure/persistence/prisma-auth-users.repository';

type SocketData = { user?: AuthUser };

@Injectable()
export class WsSocketAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authUsersRepository: PrismaAuthUsersRepository,
  ) {}

  async authenticate(client: Socket): Promise<AuthUser | null> {
    const cached = (client.data as SocketData).user;
    if (cached) {
      return cached;
    }
    const token = this.extractToken(client);
    if (!token) {
      return null;
    }
    try {
      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        token,
        {
          secret,
        },
      );
      const user = await this.authUsersRepository.findPublicProfileById(
        payload.sub,
      );
      if (!user) {
        return null;
      }
      (client.data as SocketData).user = user;
      return user;
    } catch {
      return null;
    }
  }

  private extractToken(client: Socket): string | null {
    const rawAuth = client.handshake.auth as { token?: unknown } | undefined;
    const rawQuery = client.handshake.query as { token?: unknown };
    if (typeof rawAuth?.token === 'string') {
      return rawAuth.token;
    }
    if (typeof rawQuery?.token === 'string') {
      return rawQuery.token;
    }
    return null;
  }
}
