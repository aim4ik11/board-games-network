import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FriendsModule } from '../friends/friends.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatApplicationService } from './application/chat.application.service';
import { ChatRepositoryPort } from './domain/ports/chat.repository.port';
import { PrismaChatRepository } from './infrastructure/persistence/prisma-chat.repository';
import { ChatBroadcastService } from './infrastructure/realtime/chat-broadcast.service';
import { ChatController } from './presentation/http/chat.controller';
import { ChatGateway } from './presentation/ws/chat.gateway';

@Module({
  imports: [AuthModule, FriendsModule, PrismaModule],
  controllers: [ChatController],
  providers: [
    ChatApplicationService,
    ChatBroadcastService,
    ChatGateway,
    {
      provide: ChatRepositoryPort,
      useClass: PrismaChatRepository,
    },
  ],
})
export class ChatModule {}
