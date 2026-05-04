import { PlaySessionVisibility } from '@prisma/client';

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
