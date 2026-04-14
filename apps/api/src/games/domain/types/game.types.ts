/** Domain / read-model types for the games catalog (no framework or ORM imports). */

export type BoardGameListItem = {
  id: string;
  slug: string;
  title: string;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMin: number | null;
  imageUrl: string | null;
};

export type BoardGameRecord = BoardGameListItem & {
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
