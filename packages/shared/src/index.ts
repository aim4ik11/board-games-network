/**
 * Browser-safe HTTP/JSON wire contracts shared by API and web.
 * No Nest, Prisma, or React — date-like fields are ISO strings.
 */

export const SHARED_VERSION = '0.0.1';

// --- Pagination ---

export type PaginatedMeta = {
  total: number;
  page: number;
  limit: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginatedMeta;
};

// --- Auth / profile ---

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  city: string | null;
  avatarUrl: string | null;
};

export type PublicUserCard = Omit<AuthUser, 'email'>;

export type PublicProfileGamePreview = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
};

export type PublicProfileSummary = {
  user: PublicUserCard;
  stats: {
    collectionTotal: number;
    ownedCount: number;
    wishlistCount: number;
    previouslyOwnedCount: number;
    friendsCount: number;
    ratingsCount: number;
    reviewsCount: number;
  };
  collectionPreview: {
    owned: PublicProfileGamePreview[];
    wishlist: PublicProfileGamePreview[];
    previouslyOwned: PublicProfileGamePreview[];
  };
};

export type AuthSuccessResponse = {
  accessToken: string;
  user: AuthUser;
};

// --- Games ---

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

export type GamesListResponse = PaginatedResponse<GameListItem>;

export type GameDetail = GameListItem & {
  description: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
  averageRating: number | null;
  ratingCount: number;
  reviewCount: number;
};

// --- Collection ---

export const COLLECTION_STATUSES = [
  'OWNED',
  'WISHLIST',
  'PREVIOUSLY_OWNED',
] as const;

export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

export type CollectionEntry = {
  id: string;
  status: CollectionStatus;
  notes: string | null;
  acquiredAt: string | null;
  game: GameListItem;
};

// --- Friends ---

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

// --- Chat ---

export type ConversationMember = Pick<
  PublicUserCard,
  'id' | 'displayName' | 'avatarUrl'
>;

export type MessageView = {
  id: string;
  conversationId: string;
  body: string;
  createdAt: string;
  sender: { id: string; displayName: string };
};

export type ConversationListItem = {
  id: string;
  type: string;
  title: string | null;
  playSessionId: string | null;
  updatedAt: string;
  otherUser: PublicUserCard | null;
  lastMessage: {
    body: string;
    createdAt: string;
    senderDisplayName: string;
  } | null;
};

export type ConversationMessages = {
  conversation: {
    id: string;
    type: string;
    title: string | null;
    playSessionId: string | null;
  };
  data: MessageView[];
  members: ConversationMember[];
  meta: PaginatedMeta;
};

// --- Meetups ---

export const PLAY_SESSION_VISIBILITIES = [
  'PUBLIC',
  'FRIENDS',
  'INVITE_ONLY',
] as const;

export type PlaySessionVisibility = (typeof PLAY_SESSION_VISIBILITIES)[number];

export type MeetupHost = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
};

export type MeetupGame = {
  id: string;
  slug: string;
  title: string;
};

export type MeetupParticipant = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
};

export type MeetupListItem = {
  id: string;
  title: string;
  scheduledAt: string;
  location: string | null;
  maxPlayers: number | null;
  status: string;
  visibility: PlaySessionVisibility;
  host: MeetupHost;
  game: MeetupGame | null;
  joinedParticipantCount: number;
};

export type MeetupDetail = MeetupListItem & {
  description: string | null;
  participants: MeetupParticipant[];
};

/** JSON body for POST /meetups */
export type CreateMeetupPayload = {
  title: string;
  scheduledAt: string;
  gameId?: string;
  location?: string;
  maxPlayers?: number;
  description?: string;
  visibility?: PlaySessionVisibility;
};

/** JSON body for PATCH /meetups/:id */
export type PatchMeetupPayload = {
  title?: string;
  scheduledAt?: string;
  gameId?: string;
  location?: string;
  maxPlayers?: number;
  description?: string;
  visibility?: PlaySessionVisibility;
};
