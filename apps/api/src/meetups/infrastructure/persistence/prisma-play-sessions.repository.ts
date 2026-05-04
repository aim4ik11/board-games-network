import { Injectable } from '@nestjs/common';
import {
  ConversationType,
  FriendshipStatus,
  ParticipantStatus,
  PlaySessionStatus,
  PlaySessionVisibility,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  CreateMeetupProps,
  MeetupDetailView,
  MeetupGameSummary,
  MeetupHostSummary,
  MeetupListItemView,
  MeetupParticipantView,
  UpdateMeetupPatch,
} from '../../domain/types/meetup.types';

const hostSelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
  city: true,
} as const;

const gameSelect = {
  id: true,
  slug: true,
  title: true,
} as const;

const participantUserSelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
} as const;

@Injectable()
export class PrismaPlaySessionsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findManyForList(params: {
    status?: string;
    scheduledFrom?: Date;
    visibility?: string;
    skip: number;
    take: number;
  }): Promise<{ items: MeetupListItemView[]; total: number }> {
    const where: Prisma.PlaySessionWhereInput = {};
    if (params.status) {
      where.status = params.status as PlaySessionStatus;
    }
    if (params.scheduledFrom) {
      where.scheduledAt = { gte: params.scheduledFrom };
    }
    if (params.visibility) {
      where.visibility = params.visibility as PlaySessionVisibility;
    }
    const [rows, total] = await this.queryList(where, params.skip, params.take);
    const items = rows.map((r) => this.toListItem(r));
    return { items, total };
  }

  async findManyVisibleToUser(params: {
    userId: string;
    status?: string;
    scheduledFrom?: Date;
    skip: number;
    take: number;
  }): Promise<{ items: MeetupListItemView[]; total: number }> {
    const where: Prisma.PlaySessionWhereInput = {
      OR: [
        { visibility: PlaySessionVisibility.PUBLIC },
        { hostId: params.userId },
        {
          visibility: PlaySessionVisibility.FRIENDS,
          host: {
            OR: [
              {
                friendshipsRequested: {
                  some: {
                    addresseeId: params.userId,
                    status: FriendshipStatus.ACCEPTED,
                  },
                },
              },
              {
                friendshipsReceived: {
                  some: {
                    requesterId: params.userId,
                    status: FriendshipStatus.ACCEPTED,
                  },
                },
              },
            ],
          },
        },
        {
          visibility: PlaySessionVisibility.INVITE_ONLY,
          invitations: { some: { invitedUserId: params.userId } },
        },
      ],
    };
    if (params.status) {
      where.status = params.status as PlaySessionStatus;
    }
    if (params.scheduledFrom) {
      where.scheduledAt = { gte: params.scheduledFrom };
    }
    const [rows, total] = await this.queryList(where, params.skip, params.take);
    const items = rows.map((r) => this.toListItem(r));
    return { items, total };
  }

  private async queryList(
    where: Prisma.PlaySessionWhereInput,
    skip: number,
    take: number,
  ) {
    const [rows, total] = await Promise.all([
      this.prismaService.playSession.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledAt: 'asc' },
        include: {
          host: { select: hostSelect },
          game: { select: gameSelect },
          participants: {
            where: { status: ParticipantStatus.JOINED },
            select: { id: true },
          },
        },
      }),
      this.prismaService.playSession.count({ where }),
    ]);
    return [rows, total] as const;
  }

  async findDetailById(id: string): Promise<MeetupDetailView | null> {
    const row = await this.prismaService.playSession.findUnique({
      where: { id },
      include: {
        host: { select: hostSelect },
        game: { select: gameSelect },
        participants: {
          include: { user: { select: participantUserSelect } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return row ? this.toDetail(row) : null;
  }

  async create(props: CreateMeetupProps): Promise<MeetupDetailView> {
    const created = await this.prismaService.playSession.create({
      data: {
        hostId: props.hostId,
        title: props.title,
        scheduledAt: props.scheduledAt,
        gameId: props.gameId ?? undefined,
        location: props.location ?? undefined,
        maxPlayers: props.maxPlayers ?? undefined,
        description: props.description ?? undefined,
        status: PlaySessionStatus.SCHEDULED,
        visibility: props.visibility ?? PlaySessionVisibility.PUBLIC,
        conversation: {
          create: {
            type: ConversationType.SESSION,
            title: props.title,
            members: {
              create: [{ userId: props.hostId }],
            },
          },
        },
      },
      select: { id: true },
    });
    return (await this.findDetailById(created.id))!;
  }

  async updateById(
    id: string,
    patch: UpdateMeetupPatch,
  ): Promise<MeetupDetailView | null> {
    const existing = await this.prismaService.playSession.findUnique({
      where: { id },
    });
    if (!existing) {
      return null;
    }
    await this.prismaService.$transaction(async (tx) => {
      await tx.playSession.update({
        where: { id },
        data: {
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.scheduledAt !== undefined && {
            scheduledAt: patch.scheduledAt,
          }),
          ...(patch.gameId !== undefined && {
            gameId: patch.gameId,
          }),
          ...(patch.location !== undefined && { location: patch.location }),
          ...(patch.maxPlayers !== undefined && {
            maxPlayers: patch.maxPlayers,
          }),
          ...(patch.description !== undefined && {
            description: patch.description,
          }),
          ...(patch.visibility !== undefined && {
            visibility: patch.visibility,
          }),
        },
      });
      if (patch.title !== undefined) {
        await tx.conversation.updateMany({
          where: { playSessionId: id },
          data: { title: patch.title },
        });
      }
    });
    return this.findDetailById(id);
  }

  async setStatus(
    id: string,
    status: string,
  ): Promise<MeetupDetailView | null> {
    const existing = await this.prismaService.playSession.findUnique({
      where: { id },
    });
    if (!existing) {
      return null;
    }
    await this.prismaService.playSession.update({
      where: { id },
      data: { status: status as PlaySessionStatus },
    });
    return this.findDetailById(id);
  }

  async getHostId(id: string): Promise<string | null> {
    const row = await this.prismaService.playSession.findUnique({
      where: { id },
      select: { hostId: true },
    });
    return row?.hostId ?? null;
  }

  async getSessionMeta(id: string): Promise<{
    hostId: string;
    status: string;
    visibility: string;
    maxPlayers: number | null;
    scheduledAt: Date;
  } | null> {
    const row = await this.prismaService.playSession.findUnique({
      where: { id },
      select: {
        hostId: true,
        status: true,
        visibility: true,
        maxPlayers: true,
        scheduledAt: true,
      },
    });
    if (!row) {
      return null;
    }
    return {
      hostId: row.hostId,
      status: row.status,
      visibility: row.visibility,
      maxPlayers: row.maxPlayers,
      scheduledAt: row.scheduledAt,
    };
  }

  async countJoinedParticipants(sessionId: string): Promise<number> {
    return this.prismaService.playSessionParticipant.count({
      where: {
        sessionId,
        status: ParticipantStatus.JOINED,
      },
    });
  }

  async findParticipantStatus(
    sessionId: string,
    userId: string,
  ): Promise<string | null> {
    const row = await this.prismaService.playSessionParticipant.findUnique({
      where: {
        sessionId_userId: { sessionId, userId },
      },
      select: { status: true },
    });
    return row?.status ?? null;
  }

  async addParticipant(sessionId: string, userId: string): Promise<void> {
    await this.prismaService.$transaction(async (tx) => {
      await tx.playSessionParticipant.create({
        data: {
          sessionId,
          userId,
          status: ParticipantStatus.JOINED,
        },
      });
      const conversation = await tx.conversation.findUnique({
        where: { playSessionId: sessionId },
        select: { id: true },
      });
      if (conversation) {
        await tx.conversationMember.create({
          data: { conversationId: conversation.id, userId },
        });
      }
    });
  }

  async removeParticipant(sessionId: string, userId: string): Promise<boolean> {
    try {
      await this.prismaService.$transaction(async (tx) => {
        await tx.playSessionParticipant.delete({
          where: {
            sessionId_userId: { sessionId, userId },
          },
        });
        const conversation = await tx.conversation.findUnique({
          where: { playSessionId: sessionId },
          select: { id: true },
        });
        if (conversation) {
          await tx.conversationMember.delete({
            where: {
              conversationId_userId: {
                conversationId: conversation.id,
                userId,
              },
            },
          });
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  async addInvitation(sessionId: string, invitedUserId: string): Promise<void> {
    await this.prismaService.playSessionInvitation.create({
      data: { sessionId, invitedUserId },
    });
  }

  async hasInvitation(
    sessionId: string,
    invitedUserId: string,
  ): Promise<boolean> {
    const row = await this.prismaService.playSessionInvitation.findUnique({
      where: { sessionId_invitedUserId: { sessionId, invitedUserId } },
      select: { id: true },
    });
    return row !== null;
  }

  async gameExists(gameId: string): Promise<boolean> {
    const row = await this.prismaService.boardGame.findUnique({
      where: { id: gameId },
      select: { id: true },
    });
    return row !== null;
  }

  private toHost(row: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    city: string | null;
  }): MeetupHostSummary {
    return {
      id: row.id,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      city: row.city,
    };
  }

  private toGame(
    row: { id: string; slug: string; title: string } | null,
  ): MeetupGameSummary | null {
    return row;
  }

  private toListItem(
    row: Prisma.PlaySessionGetPayload<{
      include: {
        host: { select: typeof hostSelect };
        game: { select: typeof gameSelect };
        participants: { select: { id: true } };
      };
    }>,
  ): MeetupListItemView {
    return {
      id: row.id,
      title: row.title,
      scheduledAt: row.scheduledAt.toISOString(),
      location: row.location,
      maxPlayers: row.maxPlayers,
      status: row.status,
      visibility: row.visibility,
      host: this.toHost(row.host),
      game: this.toGame(row.game),
      joinedParticipantCount: row.participants.length,
    };
  }

  private toDetail(
    row: Prisma.PlaySessionGetPayload<{
      include: {
        host: { select: typeof hostSelect };
        game: { select: typeof gameSelect };
        participants: {
          include: { user: { select: typeof participantUserSelect } };
        };
      };
    }>,
  ): MeetupDetailView {
    const joinedCount = row.participants.filter(
      (p) => p.status === ParticipantStatus.JOINED,
    ).length;
    const participants: MeetupParticipantView[] = row.participants.map((p) => ({
      userId: p.user.id,
      displayName: p.user.displayName,
      avatarUrl: p.user.avatarUrl,
      status: p.status,
    }));
    return {
      id: row.id,
      title: row.title,
      scheduledAt: row.scheduledAt.toISOString(),
      location: row.location,
      maxPlayers: row.maxPlayers,
      status: row.status,
      visibility: row.visibility,
      host: this.toHost(row.host),
      game: this.toGame(row.game),
      joinedParticipantCount: joinedCount,
      description: row.description,
      participants,
    };
  }
}
