import { Injectable } from '@nestjs/common';
import { ConversationType, Prisma } from '@prisma/client';
import type { PublicUserCard } from '../../../auth/domain/types/auth-user.types';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChatRepositoryPort } from '../../domain/ports/chat.repository.port';
import type {
  ConversationMemberView,
  ConversationListItemView,
  MessageView,
} from '../../domain/types/chat.types';

const cardSelect = {
  id: true,
  displayName: true,
  bio: true,
  city: true,
  avatarUrl: true,
} as const;

const messageInclude = {
  sender: { select: { id: true, displayName: true } },
} as const;

@Injectable()
export class PrismaChatRepository extends ChatRepositoryPort {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async findDirectConversationIdBetween(
    userIdA: string,
    userIdB: string,
  ): Promise<string | null> {
    const rows = await this.prismaService.conversation.findMany({
      where: {
        type: ConversationType.DIRECT,
        playSessionId: null,
        AND: [
          { members: { some: { userId: userIdA } } },
          { members: { some: { userId: userIdB } } },
        ],
      },
      include: { members: true },
    });
    const match = rows.find((c) => c.members.length === 2);
    return match?.id ?? null;
  }

  async createDirectConversation(
    userIdA: string,
    userIdB: string,
  ): Promise<string> {
    const created = await this.prismaService.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        members: {
          create: [{ userId: userIdA }, { userId: userIdB }],
        },
      },
      select: { id: true },
    });
    return created.id;
  }

  async listConversationsForUser(
    userId: string,
  ): Promise<ConversationListItemView[]> {
    const rows = await this.prismaService.conversation.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: { user: { select: cardSelect } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: messageInclude,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => this.toListItem(row, userId));
  }

  async isMember(userId: string, conversationId: string): Promise<boolean> {
    const m = await this.prismaService.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      select: { id: true },
    });
    return m !== null;
  }

  async listMessages(params: {
    conversationId: string;
    skip: number;
    take: number;
  }): Promise<{ items: MessageView[]; total: number }> {
    const where: Prisma.MessageWhereInput = {
      conversationId: params.conversationId,
    };
    const [total, rows] = await Promise.all([
      this.prismaService.message.count({ where }),
      this.prismaService.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
        include: messageInclude,
      }),
    ]);
    const items = rows
      .slice()
      .reverse()
      .map((r) => this.toMessageView(r));
    return { items, total };
  }

  async createMessage(params: {
    conversationId: string;
    senderId: string;
    body: string;
  }): Promise<MessageView> {
    const row = await this.prismaService.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId: params.conversationId,
          senderId: params.senderId,
          body: params.body,
        },
        include: messageInclude,
      });
      await tx.conversation.update({
        where: { id: params.conversationId },
        data: { updatedAt: new Date() },
      });
      return msg;
    });
    return this.toMessageView(row);
  }

  async listConversationMembers(
    conversationId: string,
  ): Promise<ConversationMemberView[]> {
    const rows = await this.prismaService.conversationMember.findMany({
      where: { conversationId },
      select: { user: { select: cardSelect } },
      orderBy: { joinedAt: 'asc' },
    });
    return rows.map((row) => ({
      id: row.user.id,
      displayName: row.user.displayName,
      avatarUrl: row.user.avatarUrl,
    }));
  }

  private toMessageView(
    row: Prisma.MessageGetPayload<{ include: typeof messageInclude }>,
  ): MessageView {
    return {
      id: row.id,
      conversationId: row.conversationId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      sender: {
        id: row.sender.id,
        displayName: row.sender.displayName,
      },
    };
  }

  private toListItem(
    row: Prisma.ConversationGetPayload<{
      include: {
        members: { include: { user: { select: typeof cardSelect } } };
        messages: { include: typeof messageInclude };
      };
    }>,
    meId: string,
  ): ConversationListItemView {
    let otherUser: PublicUserCard | null = null;
    if (row.type === ConversationType.DIRECT && row.members.length === 2) {
      const other = row.members.find((m) => m.userId !== meId);
      otherUser = other ? (other.user as PublicUserCard) : null;
    }
    const last = row.messages[0];
    return {
      id: row.id,
      type: row.type,
      updatedAt: row.updatedAt.toISOString(),
      otherUser,
      lastMessage: last
        ? {
            body: last.body,
            createdAt: last.createdAt.toISOString(),
            senderDisplayName: last.sender.displayName,
          }
        : null,
    };
  }
}
