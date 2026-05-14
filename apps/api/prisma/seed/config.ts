export type SeedConfig = {
  topGamesLimit: number;
  minUserRatings: number;
  datasetStrict: boolean;
  mockData: boolean;
  userCount: number;
  userPassword: string;
  rngSeed: number;
  ratingsPerUserMin: number;
  ratingsPerUserMax: number;
  reviewChance: number;
  friendshipsPerUserMin: number;
  friendshipsPerUserMax: number;
  collectionPerUserMin: number;
  collectionPerUserMax: number;
  meetupCount: number;
  messagesPerConversationMin: number;
  messagesPerConversationMax: number;
  pruneGames: boolean;
};

const DEFAULT_TOP_LIMIT = 40;
const DEFAULT_MIN_USER_RATINGS = 500;
const DEFAULT_USER_COUNT = 48;
const DEFAULT_PASSWORD = 'password123';

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim().length === 0) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === '0' || normalized === 'false' || normalized === 'no') {
    return false;
  }
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return true;
  }
  return fallback;
}

export function loadSeedConfig(): SeedConfig {
  const mockData = parseBool(
    process.env.SEED_MOCK_DATA ??
      process.env.SEED_PLAYERS ??
      '1',
    true,
  );

  return {
    topGamesLimit: parsePositiveInt(
      process.env.BOARDGAMES_TOP_LIMIT,
      DEFAULT_TOP_LIMIT,
    ),
    minUserRatings: parsePositiveInt(
      process.env.BOARDGAMES_MIN_USER_RATINGS,
      DEFAULT_MIN_USER_RATINGS,
    ),
    datasetStrict: process.env.BOARDGAMES_DATASET_STRICT === '1',
    mockData,
    userCount: parsePositiveInt(
      process.env.SEED_USERS_COUNT ?? process.env.SEED_PLAYERS_COUNT,
      DEFAULT_USER_COUNT,
    ),
    userPassword:
      process.env.SEED_USERS_PASSWORD ??
      process.env.SEED_PLAYERS_PASSWORD ??
      DEFAULT_PASSWORD,
    rngSeed: parsePositiveInt(process.env.SEED_RNG_SEED, 42),
    ratingsPerUserMin: parsePositiveInt(process.env.SEED_RATINGS_MIN, 6),
    ratingsPerUserMax: parsePositiveInt(process.env.SEED_RATINGS_MAX, 18),
    reviewChance: Number.parseFloat(process.env.SEED_REVIEW_CHANCE ?? '0.55'),
    friendshipsPerUserMin: parsePositiveInt(process.env.SEED_FRIENDS_MIN, 4),
    friendshipsPerUserMax: parsePositiveInt(process.env.SEED_FRIENDS_MAX, 12),
    collectionPerUserMin: parsePositiveInt(process.env.SEED_COLLECTION_MIN, 3),
    collectionPerUserMax: parsePositiveInt(process.env.SEED_COLLECTION_MAX, 10),
    meetupCount: parsePositiveInt(process.env.SEED_MEETUP_COUNT, 36),
    messagesPerConversationMin: parsePositiveInt(
      process.env.SEED_MESSAGES_MIN,
      3,
    ),
    messagesPerConversationMax: parsePositiveInt(
      process.env.SEED_MESSAGES_MAX,
      12,
    ),
    pruneGames: parseBool(process.env.SEED_PRUNE_GAMES, mockData),
  };
}

export const SEED_MARKER = '[seed]';
