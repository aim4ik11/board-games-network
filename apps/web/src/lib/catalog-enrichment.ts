import type { GameListItem } from '@boardgame/shared';

/** Deterministic hash for mock catalog fields (backend does not expose these on list yet). */
export function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const CATALOG_GENRES = [
  { id: 'strategy', label: 'Strategy', countLabel: '4.2k' },
  { id: 'thematic', label: 'Thematic', countLabel: '2.1k' },
  { id: 'family', label: 'Family', countLabel: '3.8k' },
  { id: 'scifi', label: 'Sci-Fi', countLabel: '1.5k' },
  { id: 'fantasy', label: 'Fantasy', countLabel: '2.9k' },
  { id: 'engine', label: 'Engine Building', countLabel: '1.1k' },
] as const;

export type CatalogGenreId = (typeof CATALOG_GENRES)[number]['id'];

export const CATALOG_SORT = [
  { id: 'bgg', label: 'BGG rank' },
  { id: 'year', label: 'Release year' },
  { id: 'rating', label: 'User rating' },
  { id: 'title', label: 'Title' },
  { id: 'trending', label: 'Trending' },
] as const;

export type CatalogSortId = (typeof CATALOG_SORT)[number]['id'];

export const CATALOG_COMPLEXITY = [
  { id: 'very-light', label: 'Very light (0.0 – 1.0)', min: 0, max: 1 },
  { id: 'light', label: 'Light (1.0 – 2.0)', min: 1, max: 2 },
  { id: 'medium', label: 'Medium (2.0 – 3.0)', min: 2, max: 3 },
  { id: 'heavy', label: 'Heavy (3.0 – 4.0)', min: 3, max: 4 },
  { id: 'expert', label: 'Expert (4.0+)', min: 4, max: 5 },
] as const;

export type CatalogComplexityId = (typeof CATALOG_COMPLEXITY)[number]['id'];

export type EnrichedGame = GameListItem & {
  /** Mock 0–10 style score for badge (list has no aggregate rating). */
  displayRating: number;
  /** Effective weight for filters / display (DB complexity or mock). */
  weight: number;
  /** Primary genre slug for chip when API returns no genres (mock). */
  primaryGenre: CatalogGenreId;
  secondaryGenre: CatalogGenreId;
};

const GENRE_IDS: CatalogGenreId[] = CATALOG_GENRES.map((g) => g.id);

export function enrichGame(game: GameListItem): EnrichedGame {
  const h = hash32(game.id);
  const displayRating = Math.round((7 + (h % 29) / 10) * 10) / 10;
  const mockWeight = Math.round((1.2 + ((h >> 5) % 32) / 10) * 100) / 100;
  const weight =
    game.complexity != null && Number.isFinite(game.complexity)
      ? game.complexity
      : mockWeight;
  const primaryGenre = GENRE_IDS[h % GENRE_IDS.length];
  const secondaryGenre = GENRE_IDS[(h >> 8) % GENRE_IDS.length];

  return {
    ...game,
    displayRating,
    weight,
    primaryGenre,
    secondaryGenre,
  };
}

export function formatPlayerRange(
  min: number | null,
  max: number | null,
): string {
  if (min != null && max != null) {
    return `${min}-${max}`;
  }
  if (min != null) {
    return `${min}+`;
  }
  if (max != null) {
    return `≤${max}`;
  }
  return '—';
}

export function formatPlaytime(
  min: number | null,
  max: number | null,
): string {
  if (min != null && max != null && min !== max) {
    return `${min}-${max}m`;
  }
  if (min != null) {
    return `${min}m`;
  }
  if (max != null) {
    return `${max}m`;
  }
  return '—';
}

export function sortEnrichedGames(
  games: EnrichedGame[],
  sort: CatalogSortId,
  order: 'asc' | 'desc' = 'asc',
): EnrichedGame[] {
  const copy = [...games];
  const inv = order === 'desc' ? -1 : 1;
  switch (sort) {
    case 'bgg':
    case 'rating':
      return copy.sort(
        (a, b) => inv * (a.displayRating - b.displayRating),
      );
    case 'year':
      return copy.sort((a, b) => {
        const ya = a.yearPublished ?? -1;
        const yb = b.yearPublished ?? -1;
        return inv * (ya - yb);
      });
    case 'title':
      return copy.sort((a, b) => inv * a.title.localeCompare(b.title));
    case 'trending':
      return copy.sort((a, b) => inv * (hash32(a.id) - hash32(b.id)));
    default:
      return copy;
  }
}

export function genreLabel(id: CatalogGenreId): string {
  return CATALOG_GENRES.find((g) => g.id === id)?.label ?? id;
}

export function primaryGenreDisplay(game: EnrichedGame): string {
  const first = game.genres[0];
  if (first) {
    return first.name;
  }
  return genreLabel(game.primaryGenre);
}
