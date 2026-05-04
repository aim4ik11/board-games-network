import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AuthUser } from '@boardgame/shared';
import { PrismaAuthUsersRepository } from '../../../auth/infrastructure/persistence/prisma-auth-users.repository';
import { ChatApplicationService } from '../../application/chat.application.service';
import { ChatBroadcastService } from '../../infrastructure/realtime/chat-broadcast.service';

const webOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:5173').split(
  ',',
);

type SocketData = { user?: AuthUser };

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: webOrigins,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authUsersRepository: PrismaAuthUsersRepository,
    private readonly chatApplicationService: ChatApplicationService,
    private readonly chatBroadcastService: ChatBroadcastService,
  ) {}

  afterInit(server: Server): void {
    this.chatBroadcastService.registerServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const user = await this.resolveUser(client);
    if (!user) {
      this.logger.warn('Socket connection rejected: no token');
      client.disconnect();
    }
  }

  @SubscribeMessage('join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const user = await this.resolveUser(client);
    if (!user?.id || !body?.conversationId) {
      return { ok: false, error: 'Unauthorized' };
    }
    const ok = await this.chatApplicationService.assertMember(
      user.id,
      body.conversationId,
    );
    if (!ok) {
      return { ok: false, error: 'Forbidden' };
    }
    await client.join(`conv:${body.conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave')
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string },
  ): Promise<{ ok: boolean }> {
    if (!body?.conversationId) {
      return { ok: false };
    }
    await client.leave(`conv:${body.conversationId}`);
    return { ok: true };
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

  private async resolveUser(client: Socket): Promise<AuthUser | null> {
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
}
