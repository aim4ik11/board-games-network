export type PaginatedMeta = {
  total: number;
  page: number;
  limit: number;
};

export type GameListItem = {
  id: string;
  slug: string;
  title: string;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMin: number | null;
  imageUrl: string | null;
};

export type GamesListResponse = {
  data: GameListItem[];
  meta: PaginatedMeta;
};

export type GameDetail = GameListItem & {
  description: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
  averageRating: number | null;
  ratingCount: number;
  reviewCount: number;
};

export type CollectionStatus = 'OWNED' | 'WISHLIST' | 'PREVIOUSLY_OWNED';

export type CollectionEntry = {
  id: string;
  status: CollectionStatus;
  notes: string | null;
  acquiredAt: string | null;
  game: GameListItem;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  city: string | null;
  avatarUrl: string | null;
};

export type PublicUserCard = Omit<AuthUser, 'email'>;

export type FriendshipRelationship =
  | 'none'
  | 'friend'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'blocked';

export type DiscoverUserRow = PublicUserCard & {
  relationship: FriendshipRelationship;
};

export type FriendConnection = {
  friendshipId: string;
  user: PublicUserCard;
  friendsSince: string;
};

export type PendingRequest = {
  friendshipId: string;
  user: PublicUserCard;
  createdAt: string;
};

export type MessageView = {
  id: string;
  conversationId: string;
  body: string;
  createdAt: string;
  sender: { id: string; displayName: string };
};

export type AuthSuccessResponse = {
  accessToken: string;
  user: AuthUser;
};
