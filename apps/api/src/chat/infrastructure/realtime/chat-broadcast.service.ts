import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { MessageView } from '../../domain/types/chat.types';

@Injectable()
export class ChatBroadcastService {
  private server: Server | null = null;

  registerServer(server: Server): void {
    this.server = server;
  }

  emitNewMessage(conversationId: string, message: MessageView): void {
    this.server
      ?.to(`conv:${conversationId}`)
      .emit('message:new', { conversationId, message });
  }
}
