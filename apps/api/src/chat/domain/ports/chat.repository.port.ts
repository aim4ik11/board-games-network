import { Injectable } from '@nestjs/common';
import type {
  ConversationMemberView,
  ConversationListItemView,
  MessageView,
} from '../types/chat.types';

@Injectable()
export abstract class ChatRepositoryPort {
  abstract findDirectConversationIdBetween(
    userIdA: string,
    userIdB: string,
  ): Promise<string | null>;

  abstract createDirectConversation(
    userIdA: string,
    userIdB: string,
  ): Promise<string>;

  abstract createGroupConversation(params: {
    creatorId: string;
    memberIds: string[];
    title?: string | null;
  }): Promise<string>;

  abstract listConversationsForUser(
    userId: string,
  ): Promise<ConversationListItemView[]>;

  abstract isMember(userId: string, conversationId: string): Promise<boolean>;

  abstract listMessages(params: {
    conversationId: string;
    skip: number;
    take: number;
  }): Promise<{ items: MessageView[]; total: number }>;

  abstract createMessage(params: {
    conversationId: string;
    senderId: string;
    body: string;
  }): Promise<MessageView>;

  abstract listConversationMembers(
    conversationId: string,
  ): Promise<ConversationMemberView[]>;

  abstract addConversationMember(
    conversationId: string,
    userId: string,
  ): Promise<void>;

  abstract getConversationSummary(
    conversationId: string,
  ): Promise<{
    id: string;
    type: string;
    title: string | null;
    playSessionId: string | null;
  } | null>;
}
