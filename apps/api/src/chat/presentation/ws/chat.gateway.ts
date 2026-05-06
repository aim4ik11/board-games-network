import { Logger } from '@nestjs/common';
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
import { WsSocketAuthService } from '../../../auth/application/ws-socket-auth.service';
import { ChatApplicationService } from '../../application/chat.application.service';
import { ChatBroadcastService } from '../../infrastructure/realtime/chat-broadcast.service';
import { ChatRoomDto } from './dto/chat-room.dto';

const webOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:5173').split(
  ',',
);

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
    private readonly wsSocketAuthService: WsSocketAuthService,
    private readonly chatApplicationService: ChatApplicationService,
    private readonly chatBroadcastService: ChatBroadcastService,
  ) {}

  afterInit(server: Server): void {
    this.chatBroadcastService.registerServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const user = await this.wsSocketAuthService.authenticate(client);
    if (!user) {
      this.logger.warn('Socket connection rejected: no token');
      client.disconnect();
    }
  }

  @SubscribeMessage('join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: ChatRoomDto,
  ): Promise<{ ok: boolean; error?: string }> {
    const user = await this.wsSocketAuthService.authenticate(client);
    if (!user?.id) {
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
    @MessageBody() body: ChatRoomDto,
  ): Promise<{ ok: boolean }> {
    const user = await this.wsSocketAuthService.authenticate(client);
    if (!user?.id) {
      return { ok: false };
    }
    await client.leave(`conv:${body.conversationId}`);
    return { ok: true };
  }
}
