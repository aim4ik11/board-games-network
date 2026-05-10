/** Domain / read-model types for the games catalog (no framework or ORM imports). */

import type { GameListItem } from '@boardgame/shared';

export type BoardGameRecord = GameListItem & {
  description: string | null;
  externalId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type GameDetailWithStats = BoardGameRecord & {
  averageRating: number | null;
  ratingCount: number;
  reviewCount: number;
};

export type CreateGameProps = {
  title: string;
  description?: string;
  yearPublished?: number;
  minPlayers?: number;
  maxPlayers?: number;
  playTimeMin?: number;
  playTimeMax?: number;
  complexity?: number;
  /** Connect genres by stable slug (must exist). */
  genreSlugs?: string[];
  imageUrl?: string;
  externalId?: string;
};

export type UpdateGamePatch = Partial<CreateGameProps>;

export type ReviewAuthorSummary = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type ReviewWithAuthorView = {
  id: string;
  body: string;
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  user: ReviewAuthorSummary;
};

export type RatingUpsertResult = {
  id: string;
  score: number;
  userId: string;
  gameId: string;
};

export type DeleteRatingResult = 'deleted' | 'not_found' | 'no_game';
