import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendsApplicationService } from '../../friends/application/friends.application.service';
import { PrismaChatRepository } from '../infrastructure/persistence/prisma-chat.repository';
import { ChatBroadcastService } from '../infrastructure/realtime/chat-broadcast.service';
import type {
  ConversationListItem,
  ConversationMessages,
  MessageView,
} from '@boardgame/shared';

@Injectable()
export class ChatApplicationService {
  constructor(
    private readonly chatRepository: PrismaChatRepository,
    private readonly friendsApplicationService: FriendsApplicationService,
    private readonly chatBroadcastService: ChatBroadcastService,
  ) {}

  listConversations(userId: string): Promise<ConversationListItem[]> {
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

  async createGroupConversation(
    creatorId: string,
    memberIds: string[],
    title?: string,
  ): Promise<{ conversationId: string }> {
    const normalizedMemberIds = Array.from(
      new Set(memberIds.map((id) => id.trim()).filter(Boolean)),
    ).filter((id) => id !== creatorId);
    if (normalizedMemberIds.length === 0) {
      throw new BadRequestException('At least one other member is required');
    }
    const normalizedTitle = title?.trim();
    if (!normalizedTitle) {
      throw new BadRequestException('Group chat title is required');
    }
    const areFriends = await Promise.all(
      normalizedMemberIds.map((id) =>
        this.friendsApplicationService.areAcceptedFriends(creatorId, id),
      ),
    );
    if (areFriends.some((ok) => !ok)) {
      throw new ForbiddenException(
        'You can only add accepted friends to group chats',
      );
    }
    const conversationId = await this.chatRepository.createGroupConversation({
      creatorId,
      memberIds: normalizedMemberIds,
      title: normalizedTitle,
    });
    return { conversationId };
  }

  async listMessages(
    userId: string,
    conversationId: string,
    page: number,
    limit: number,
  ): Promise<ConversationMessages> {
    const member = await this.chatRepository.isMember(userId, conversationId);
    if (!member) {
      throw new NotFoundException('Conversation not found');
    }
    const skip = (page - 1) * limit;
    const [{ items, total }, members, conversation] = await Promise.all([
      this.chatRepository.listMessages({
        conversationId,
        skip,
        take: limit,
      }),
      this.chatRepository.listConversationMembers(conversationId),
      this.chatRepository.getConversationSummary(conversationId),
    ]);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return {
      conversation,
      data: items,
      members,
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

  async inviteToConversation(
    inviterId: string,
    conversationId: string,
    invitedUserId: string,
  ): Promise<void> {
    const userId = invitedUserId.trim();
    if (!userId) {
      throw new BadRequestException('Invalid user');
    }
    if (userId === inviterId) {
      throw new BadRequestException('Cannot invite yourself');
    }
    const member = await this.chatRepository.isMember(
      inviterId,
      conversationId,
    );
    if (!member) {
      throw new NotFoundException('Conversation not found');
    }
    const conversation =
      await this.chatRepository.getConversationSummary(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.type !== 'GROUP') {
      throw new BadRequestException(
        'Members can be invited only to group chats',
      );
    }
    const alreadyMember = await this.chatRepository.isMember(
      userId,
      conversationId,
    );
    if (alreadyMember) {
      throw new ConflictException('User is already in this conversation');
    }
    const areFriends = await this.friendsApplicationService.areAcceptedFriends(
      inviterId,
      userId,
    );
    if (!areFriends) {
      throw new ForbiddenException('You can only invite accepted friends');
    }
    await this.chatRepository.addConversationMember(conversationId, userId);
  }

  async assertMember(userId: string, conversationId: string): Promise<boolean> {
    return this.chatRepository.isMember(userId, conversationId);
  }
}
