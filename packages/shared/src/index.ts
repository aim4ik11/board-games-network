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

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  password: string;
};

// --- Games ---

export type GameGenreRef = {
  slug: string;
  name: string;
};

export type GameListItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMin: number | null;
  playTimeMax: number | null;
  /** BGG-style weight / complexity (about 1–5). */
  complexity: number | null;
  genres: GameGenreRef[];
  imageUrl: string | null;
};

export type GamesListResponse = PaginatedResponse<GameListItem>;

export type GameDetail = GameListItem & {
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
  averageRating: number | null;
  ratingCount: number;
  reviewCount: number;
};

export type GameReviewAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type GameReview = {
  id: string;
  body: string;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
  user: GameReviewAuthor;
};

export type GameReviewsListResponse = PaginatedResponse<GameReview>;

/** JSON body for POST /games/:slug/reviews */
export type CreateGameReviewPayload = {
  body: string;
  imageUrls?: string[];
};

/** JSON body for PATCH /games/:slug/reviews */
export type UpdateGameReviewPayload = {
  body: string;
  imageUrls?: string[];
};

/** JSON body for PUT /games/:slug/ratings (score 1..5) */
export type UpsertGameRatingPayload = {
  score: number;
};

export type UploadedMedia = {
  key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
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

export const CONVERSATION_TYPES = ['DIRECT', 'GROUP', 'SESSION'] as const;

export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export type ConversationListItem = {
  id: string;
  type: ConversationType;
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
    type: ConversationType;
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

export const PLAY_SESSION_STATUSES = ['SCHEDULED', 'CANCELLED', 'DONE'] as const;

export type PlaySessionStatus = (typeof PLAY_SESSION_STATUSES)[number];

export const MEETUP_PARTICIPANT_STATUSES = [
  'INVITED',
  'JOINED',
  'DECLINED',
] as const;

export type MeetupParticipantStatus =
  (typeof MEETUP_PARTICIPANT_STATUSES)[number];

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
  status: MeetupParticipantStatus;
};

export type MeetupListItem = {
  id: string;
  title: string;
  scheduledAt: string;
  location: string | null;
  maxPlayers: number | null;
  status: PlaySessionStatus;
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

export type OkResponse = {
  ok: true;
};

export type ConversationIdResponse = {
  conversationId: string;
};

export type FriendRequestPayload = {
  toUserId: string;
};

export type DirectConversationPayload = {
  otherUserId: string;
};

export type GroupConversationPayload = {
  memberIds: string[];
  title?: string;
};

export type InviteConversationMemberPayload = {
  userId: string;
};
