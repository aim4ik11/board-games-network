import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendsApplicationService } from '../../friends/application/friends.application.service';
import { ChatBroadcastService } from '../infrastructure/realtime/chat-broadcast.service';
import { ChatRepositoryPort } from '../domain/ports/chat.repository.port';
import type {
  ConversationListItemView,
  MessageView,
} from '../domain/types/chat.types';

@Injectable()
export class ChatApplicationService {
  constructor(
    private readonly chatRepository: ChatRepositoryPort,
    private readonly friendsApplicationService: FriendsApplicationService,
    private readonly chatBroadcastService: ChatBroadcastService,
  ) {}

  listConversations(userId: string): Promise<ConversationListItemView[]> {
    return this.chatRepository.listConversationsForUser(userId);
  }

  async getOrCreateDirectConversation(
    meId: string,
    otherUserId: string,
  ): Promise<{ conversationId: string }> {
    if (meId === otherUserId) {
      throw new BadRequestException('Invalid recipient');
    }
    const friends = await this.friendsApplicationService.areAcceptedFriends(
      meId,
      otherUserId,
    );
    if (!friends) {
      throw new ForbiddenException('You can only message accepted friends');
    }
    let id = await this.chatRepository.findDirectConversationIdBetween(
      meId,
      otherUserId,
    );
    if (!id) {
      id = await this.chatRepository.createDirectConversation(
        meId,
        otherUserId,
      );
    }
    return { conversationId: id };
  }

  async listMessages(
    userId: string,
    conversationId: string,
    page: number,
    limit: number,
  ): Promise<{
    data: MessageView[];
    meta: { total: number; page: number; limit: number };
  }> {
    const member = await this.chatRepository.isMember(userId, conversationId);
    if (!member) {
      throw new NotFoundException('Conversation not found');
    }
    const skip = (page - 1) * limit;
    const { items, total } = await this.chatRepository.listMessages({
      conversationId,
      skip,
      take: limit,
    });
    return {
      data: items,
      meta: { total, page, limit },
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    body: string,
  ): Promise<MessageView> {
    const member = await this.chatRepository.isMember(userId, conversationId);
    if (!member) {
      throw new NotFoundException('Conversation not found');
    }
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty');
    }
    const message = await this.chatRepository.createMessage({
      conversationId,
      senderId: userId,
      body: trimmed,
    });
    this.chatBroadcastService.emitNewMessage(conversationId, message);
    return message;
  }

  async assertMember(userId: string, conversationId: string): Promise<boolean> {
    return this.chatRepository.isMember(userId, conversationId);
  }
}
