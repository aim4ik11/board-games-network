import {
  CATALOG_COMPLEXITY,
  CATALOG_GENRES,
  CATALOG_SORT,
  type CatalogComplexityId,
  type CatalogGenreId,
  type CatalogSortId,
} from './catalog-enrichment';

/** Default search for `/games` (required by the route validator). */
export const gamesListSearchDefault = {
  q: '',
  page: 1,
  /** Matches API list order (title asc). Choose other sorts for mock-ranked preview (see catalog page). */
  sort: 'title' satisfies CatalogSortId as CatalogSortId,
  /** `order` query param for API (title/year) and client mock sorts. */
  order: 'asc' as const,
  genres: '',
  players: '',
  ptMin: '',
  ptMax: '',
  complexity: '',
} as const;

export type GamesListSearch = {
  q: string;
  page: number;
  sort: CatalogSortId;
  order: 'asc' | 'desc';
  genres: string;
  players: string;
  ptMin: string;
  ptMax: string;
  complexity: string;
};

const GENRE_IDS = new Set<string>(CATALOG_GENRES.map((g) => g.id));
const COMPLEXITY_IDS = new Set<string>(
  CATALOG_COMPLEXITY.map((c) => c.id),
);

function parsePage(raw: unknown): number {
  if (typeof raw === 'string') {
    return Math.max(1, Number.parseInt(raw, 10) || 1);
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(1, raw);
  }
  return 1;
}

function parseSort(raw: unknown): CatalogSortId {
  const s = typeof raw === 'string' ? raw : '';
  if (CATALOG_SORT.some((x) => x.id === s)) {
    return s as CatalogSortId;
  }
  return gamesListSearchDefault.sort;
}

function parseSortOrder(raw: unknown): 'asc' | 'desc' {
  return raw === 'desc' ? 'desc' : 'asc';
}

function parseCommaField(
  raw: unknown,
  allowed: Set<string>,
): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    return '';
  }
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => allowed.has(p));
  return [...new Set(parts)].join(',');
}

function parsePlayers(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    return '';
  }
  const nums = raw
    .split(',')
    .map((p) => Number.parseInt(p.trim(), 10))
    .filter((n) => n >= 1 && n <= 6);
  return [...new Set(nums)].sort((a, b) => a - b).join(',');
}

function parsePt(raw: unknown): string {
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 9999) {
      return String(n);
    }
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n = Math.trunc(raw);
    if (n >= 0 && n <= 9999) {
      return String(n);
    }
  }
  return '';
}

export function parseGamesListSearch(
  raw: Record<string, unknown>,
): GamesListSearch {
  const q = typeof raw.q === 'string' ? raw.q : '';
  return {
    q,
    page: parsePage(raw.page),
    sort: parseSort(raw.sort),
    order: parseSortOrder(raw.order),
    genres: parseCommaField(raw.genres, GENRE_IDS),
    players: parsePlayers(raw.players),
    complexity: parseCommaField(raw.complexity, COMPLEXITY_IDS),
    ptMin: parsePt(raw.ptMin),
    ptMax: parsePt(raw.ptMax),
  };
}

export function hasCatalogClientFilters(search: GamesListSearch): boolean {
  if (search.genres.trim()) {
    return true;
  }
  if (search.players.trim()) {
    return true;
  }
  if (search.ptMin.trim() || search.ptMax.trim()) {
    return true;
  }
  if (search.complexity.trim()) {
    return true;
  }
  return false;
}

/** When true, list is fetched as a batch (max 100) and mock-sorted in the browser. */
export function useCatalogBatchMode(search: GamesListSearch): boolean {
  return (
    search.sort === 'bgg' ||
    search.sort === 'rating' ||
    search.sort === 'trending'
  );
}

export function parseGenreSet(genresCsv: string): Set<CatalogGenreId> {
  const s = new Set<CatalogGenreId>();
  if (!genresCsv.trim()) {
    return s;
  }
  for (const p of genresCsv.split(',')) {
    const id = p.trim() as CatalogGenreId;
    if (GENRE_IDS.has(id)) {
      s.add(id);
    }
  }
  return s;
}

export function parsePlayerSet(playersCsv: string): Set<number> {
  const s = new Set<number>();
  if (!playersCsv.trim()) {
    return s;
  }
  for (const p of playersCsv.split(',')) {
    const n = Number.parseInt(p.trim(), 10);
    if (n >= 1 && n <= 6) {
      s.add(n);
    }
  }
  return s;
}

export function parseComplexitySet(
  complexityCsv: string,
): Set<CatalogComplexityId> {
  const s = new Set<CatalogComplexityId>();
  if (!complexityCsv.trim()) {
    return s;
  }
  for (const p of complexityCsv.split(',')) {
    const id = p.trim() as CatalogComplexityId;
    if (COMPLEXITY_IDS.has(id)) {
      s.add(id);
    }
  }
  return s;
}
