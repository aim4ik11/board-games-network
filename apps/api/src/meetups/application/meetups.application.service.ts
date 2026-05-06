import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendsApplicationService } from '../../friends/application/friends.application.service';
import type {
  MeetupDetail,
  MeetupListItem,
  PlaySessionStatus,
  PlaySessionVisibility,
} from '@boardgame/shared';
import { PrismaPlaySessionsRepository } from '../infrastructure/persistence/prisma-play-sessions.repository';

@Injectable()
export class MeetupsApplicationService {
  constructor(
    private readonly playSessionsRepository: PrismaPlaySessionsRepository,
    private readonly friendsApplicationService: FriendsApplicationService,
  ) {}

  async listMeetups(params: {
    userId?: string;
    status?: PlaySessionStatus;
    upcomingOnly?: boolean;
    page: number;
    limit: number;
  }): Promise<{
    data: MeetupListItem[];
    meta: { total: number; page: number; limit: number };
  }> {
    const scheduledFrom = params.upcomingOnly ? new Date() : undefined;
    const skip = (params.page - 1) * params.limit;
    const status = params.status ?? 'SCHEDULED';
    const { items, total } = params.userId
      ? await this.playSessionsRepository.findManyVisibleToUser({
          userId: params.userId,
          status,
          ...(scheduledFrom ? { scheduledFrom } : {}),
          skip,
          take: params.limit,
        })
      : await this.playSessionsRepository.findManyForList({
          status,
          visibility: 'PUBLIC',
          ...(scheduledFrom ? { scheduledFrom } : {}),
          skip,
          take: params.limit,
        });
    return {
      data: items,
      meta: { total, page: params.page, limit: params.limit },
    };
  }

  async getMeetup(id: string, requesterId?: string): Promise<MeetupDetail> {
    const row = await this.playSessionsRepository.findDetailById(id);
    if (!row) {
      throw new NotFoundException('Meetup not found');
    }
    const canSee = await this.canAccessSession(row, requesterId);
    if (!canSee) {
      throw new NotFoundException('Meetup not found');
    }
    return row;
  }

  async createMeetup(
    hostId: string,
    props: {
      title: string;
      scheduledAt: Date;
      gameId?: string | null;
      location?: string | null;
      maxPlayers?: number | null;
      description?: string | null;
      visibility?: PlaySessionVisibility;
    },
  ): Promise<MeetupDetail> {
    if (props.gameId) {
      const ok = await this.playSessionsRepository.gameExists(props.gameId);
      if (!ok) {
        throw new NotFoundException('Game not found');
      }
    }
    return this.playSessionsRepository.create({
      hostId,
      title: props.title.trim(),
      scheduledAt: props.scheduledAt,
      gameId: props.gameId ?? null,
      location: props.location?.trim() || null,
      maxPlayers: props.maxPlayers ?? null,
      description: props.description?.trim() || null,
      visibility: props.visibility ?? 'PUBLIC',
    });
  }

  async updateMeetup(
    userId: string,
    id: string,
    patch: {
      title?: string;
      scheduledAt?: Date;
      gameId?: string | null;
      location?: string | null;
      maxPlayers?: number | null;
      description?: string | null;
      visibility?: PlaySessionVisibility;
    },
  ): Promise<MeetupDetail> {
    const hostId = await this.playSessionsRepository.getHostId(id);
    if (!hostId) {
      throw new NotFoundException('Meetup not found');
    }
    if (hostId !== userId) {
      throw new ForbiddenException('Only the host can update this meetup');
    }
    const meta = await this.playSessionsRepository.getSessionMeta(id);
    if (!meta || meta.status !== 'SCHEDULED') {
      throw new ConflictException('This meetup can no longer be edited');
    }
    if (patch.gameId) {
      const ok = await this.playSessionsRepository.gameExists(patch.gameId);
      if (!ok) {
        throw new NotFoundException('Game not found');
      }
    }
    const repoPatch = {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.scheduledAt !== undefined && {
        scheduledAt: patch.scheduledAt,
      }),
      ...(patch.gameId !== undefined && { gameId: patch.gameId }),
      ...(patch.location !== undefined && {
        location: patch.location?.trim() || null,
      }),
      ...(patch.maxPlayers !== undefined && { maxPlayers: patch.maxPlayers }),
      ...(patch.description !== undefined && {
        description: patch.description?.trim() || null,
      }),
      ...(patch.visibility !== undefined && { visibility: patch.visibility }),
    };
    if (Object.keys(repoPatch).length === 0) {
      return this.getMeetup(id, userId);
    }
    const updated = await this.playSessionsRepository.updateById(id, repoPatch);
    if (!updated) {
      throw new NotFoundException('Meetup not found');
    }
    return updated;
  }

  async cancelMeetup(userId: string, id: string): Promise<MeetupDetail> {
    const hostId = await this.playSessionsRepository.getHostId(id);
    if (!hostId) {
      throw new NotFoundException('Meetup not found');
    }
    if (hostId !== userId) {
      throw new ForbiddenException('Only the host can cancel this meetup');
    }
    const meta = await this.playSessionsRepository.getSessionMeta(id);
    if (!meta || meta.status !== 'SCHEDULED') {
      throw new ConflictException('This meetup is not scheduled');
    }
    const updated = await this.playSessionsRepository.setStatus(
      id,
      'CANCELLED',
    );
    if (!updated) {
      throw new NotFoundException('Meetup not found');
    }
    return updated;
  }

  async joinMeetup(userId: string, id: string): Promise<MeetupDetail> {
    const meta = await this.playSessionsRepository.getSessionMeta(id);
    if (!meta || meta.status !== 'SCHEDULED') {
      throw new NotFoundException('Meetup not found');
    }
    if (meta.hostId === userId) {
      throw new BadRequestException('You are already hosting this meetup');
    }
    if (meta.visibility === 'FRIENDS') {
      const areFriends =
        await this.friendsApplicationService.areAcceptedFriends(
          userId,
          meta.hostId,
        );
      if (!areFriends) {
        throw new ForbiddenException('This meetup is for friends of the host');
      }
    }
    if (meta.visibility === 'INVITE_ONLY') {
      const invited = await this.playSessionsRepository.hasInvitation(
        id,
        userId,
      );
      if (!invited) {
        throw new ForbiddenException(
          'You need an invitation to join this meetup',
        );
      }
    }
    const existing = await this.playSessionsRepository.findParticipantStatus(
      id,
      userId,
    );
    if (existing) {
      throw new ConflictException('Already joined this meetup');
    }
    const joined =
      await this.playSessionsRepository.countJoinedParticipants(id);
    if (meta.maxPlayers != null && 1 + joined >= meta.maxPlayers) {
      throw new ConflictException('This meetup is full');
    }
    await this.playSessionsRepository.addParticipant(id, userId);
    return this.getMeetup(id, userId);
  }

  async leaveMeetup(userId: string, id: string): Promise<MeetupDetail> {
    const meta = await this.playSessionsRepository.getSessionMeta(id);
    if (!meta) {
      throw new NotFoundException('Meetup not found');
    }
    if (meta.hostId === userId) {
      throw new BadRequestException(
        'Host cannot leave — cancel the meetup instead',
      );
    }
    const ok = await this.playSessionsRepository.removeParticipant(id, userId);
    if (!ok) {
      throw new NotFoundException('You are not in this meetup');
    }
    return this.getMeetup(id, userId);
  }

  async inviteToMeetup(
    hostId: string,
    meetupId: string,
    invitedUserId: string,
  ): Promise<void> {
    if (hostId === invitedUserId) {
      throw new BadRequestException('Host cannot invite themselves');
    }
    const meta = await this.playSessionsRepository.getSessionMeta(meetupId);
    if (!meta) {
      throw new NotFoundException('Meetup not found');
    }
    if (meta.hostId !== hostId) {
      throw new ForbiddenException('Only the host can invite players');
    }
    if (meta.status !== 'SCHEDULED') {
      throw new ConflictException('This meetup can no longer be updated');
    }
    const alreadyParticipant =
      await this.playSessionsRepository.findParticipantStatus(
        meetupId,
        invitedUserId,
      );
    if (alreadyParticipant) {
      throw new ConflictException('User is already in this meetup');
    }
    const hasInvite = await this.playSessionsRepository.hasInvitation(
      meetupId,
      invitedUserId,
    );
    if (hasInvite) {
      throw new ConflictException('User already invited');
    }
    await this.playSessionsRepository.addInvitation(meetupId, invitedUserId);
  }

  private async canAccessSession(
    meetup: MeetupDetail,
    requesterId?: string,
  ): Promise<boolean> {
    if (meetup.visibility === 'PUBLIC') {
      return true;
    }
    if (!requesterId) {
      return false;
    }
    if (meetup.host.id === requesterId) {
      return true;
    }
    if (
      meetup.participants.some(
        (participant) => participant.userId === requesterId,
      )
    ) {
      return true;
    }
    if (meetup.visibility === 'FRIENDS') {
      return this.friendsApplicationService.areAcceptedFriends(
        requesterId,
        meetup.host.id,
      );
    }
    return this.playSessionsRepository.hasInvitation(meetup.id, requesterId);
  }
}
