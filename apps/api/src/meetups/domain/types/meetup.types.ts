import { PlaySessionVisibility } from '@prisma/client';

export type MeetupHostSummary = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
};

export type MeetupGameSummary = {
  id: string;
  slug: string;
  title: string;
};

export type MeetupParticipantView = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
};

export type MeetupListItemView = {
  id: string;
  title: string;
  scheduledAt: string;
  location: string | null;
  maxPlayers: number | null;
  status: string;
  visibility: PlaySessionVisibility;
  host: MeetupHostSummary;
  game: MeetupGameSummary | null;
  joinedParticipantCount: number;
};

export type MeetupDetailView = MeetupListItemView & {
  description: string | null;
  participants: MeetupParticipantView[];
};

export type CreateMeetupProps = {
  hostId: string;
  title: string;
  scheduledAt: Date;
  gameId?: string | null;
  location?: string | null;
  maxPlayers?: number | null;
  description?: string | null;
  visibility?: PlaySessionVisibility;
};

export type UpdateMeetupPatch = {
  title?: string;
  scheduledAt?: Date;
  gameId?: string | null;
  location?: string | null;
  maxPlayers?: number | null;
  description?: string | null;
  visibility?: PlaySessionVisibility;
};
