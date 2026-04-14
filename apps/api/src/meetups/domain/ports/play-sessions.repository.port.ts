import { Injectable } from '@nestjs/common';
import type {
  CreateMeetupProps,
  MeetupDetailView,
  MeetupListItemView,
  UpdateMeetupPatch,
} from '../types/meetup.types';

@Injectable()
export abstract class PlaySessionsRepositoryPort {
  abstract findManyForList(params: {
    status?: string;
    scheduledFrom?: Date;
    visibility?: string;
    skip: number;
    take: number;
  }): Promise<{ items: MeetupListItemView[]; total: number }>;

  abstract findManyVisibleToUser(params: {
    userId: string;
    status?: string;
    scheduledFrom?: Date;
    skip: number;
    take: number;
  }): Promise<{ items: MeetupListItemView[]; total: number }>;

  abstract findDetailById(id: string): Promise<MeetupDetailView | null>;

  abstract create(props: CreateMeetupProps): Promise<MeetupDetailView>;

  abstract updateById(
    id: string,
    patch: UpdateMeetupPatch,
  ): Promise<MeetupDetailView | null>;

  abstract setStatus(
    id: string,
    status: string,
  ): Promise<MeetupDetailView | null>;

  abstract getHostId(id: string): Promise<string | null>;

  abstract getSessionMeta(id: string): Promise<{
    hostId: string;
    status: string;
    visibility: string;
    maxPlayers: number | null;
    scheduledAt: Date;
  } | null>;

  abstract countJoinedParticipants(sessionId: string): Promise<number>;

  abstract findParticipantStatus(
    sessionId: string,
    userId: string,
  ): Promise<string | null>;

  abstract addParticipant(sessionId: string, userId: string): Promise<void>;

  abstract removeParticipant(
    sessionId: string,
    userId: string,
  ): Promise<boolean>;

  abstract addInvitation(
    sessionId: string,
    invitedUserId: string,
  ): Promise<void>;

  abstract hasInvitation(
    sessionId: string,
    invitedUserId: string,
  ): Promise<boolean>;

  abstract gameExists(gameId: string): Promise<boolean>;
}
