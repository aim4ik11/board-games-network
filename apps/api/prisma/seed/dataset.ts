import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse } from 'csv-parse/sync';

const DEFAULT_DATASET_ZIP = 'games.csv.zip';
const DEFAULT_DATASET_CSV = 'games.csv';

export type DatasetRow = Record<string, string | undefined>;

export type ImportedGameRow = {
  slug: string;
  title: string;
  description: string;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMin: number | null;
  playTimeMax: number | null;
  complexity: number | null;
  imageUrl: string | null;
  externalId: string;
  genreSlugs: string[];
};

function getDatasetPaths() {
  const zipPath = path.resolve(
    process.cwd(),
    process.env.BOARDGAMES_ZIP_PATH ?? `prisma/${DEFAULT_DATASET_ZIP}`,
  );
  const csvPath = path.resolve(
    process.cwd(),
    process.env.BOARDGAMES_CSV_PATH ?? `prisma/${DEFAULT_DATASET_CSV}`,
  );
  return { zipPath, csvPath };
}

export async function readDatasetCsvText(): Promise<string> {
  const { zipPath, csvPath } = getDatasetPaths();

  if (existsSync(csvPath)) {
    return readFile(csvPath, 'utf-8');
  }

  if (!existsSync(zipPath)) {
    throw new Error(
      `No dataset found. Expected CSV at ${csvPath} or ZIP at ${zipPath}.`,
    );
  }

  return execFileSync('unzip', ['-p', zipPath, DEFAULT_DATASET_CSV], {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 256,
  });
}

export function loadDatasetRows(text: string): DatasetRow[] {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
  }) as DatasetRow[];
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value.length === 0) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFloatValue(value: string | undefined): number | null {
  if (value === undefined || value.length === 0) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : 'game';
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

function normalizeWhitespace(value: string): string {
  return value.replaceAll(/\s+/g, ' ').trim();
}

function sanitizeDescription(value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    return 'Imported from board games CSV dataset.';
  }
  return truncate(normalizeWhitespace(value), 1000);
}

function genreSlugsFromRow(row: DatasetRow): string[] {
  const slugs: string[] = [];
  if (row['Cat:Strategy'] === '1') {
    slugs.push('strategy');
  }
  if (row['Cat:Thematic'] === '1') {
    slugs.push('thematic');
  }
  if (row['Cat:Family'] === '1' || row['Cat:Party'] === '1') {
    slugs.push('family');
  }
  const family = (row.Family ?? '').toLowerCase();
  if (
    family.includes('science fiction') ||
    family.includes('sci-fi') ||
    family.includes('space')
  ) {
    slugs.push('scifi');
  }
  if (family.includes('fantasy')) {
    slugs.push('fantasy');
  }
  if (
    family.includes('economic') ||
    family.includes('engine') ||
    family.includes('network')
  ) {
    slugs.push('engine');
  }
  if (slugs.length === 0) {
    slugs.push('strategy');
  }
  return [...new Set(slugs)].slice(0, 3);
}

export function buildImportedGameRows(
  rows: DatasetRow[],
  topLimit: number,
  minRatings: number,
): ImportedGameRow[] {
  const usedSlugs = new Set<string>();

  const filtered = rows
    .filter((row) => {
      const rank = parseNumber(row['Rank:boardgame']);
      const ratings = parseNumber(row.NumUserRatings);
      return (
        rank !== null &&
        rank > 0 &&
        ratings !== null &&
        ratings >= minRatings &&
        row.BGGId !== undefined &&
        row.Name !== undefined
      );
    })
    .sort(
      (a, b) =>
        (parseNumber(a['Rank:boardgame']) ?? 999999) -
        (parseNumber(b['Rank:boardgame']) ?? 999999),
    )
    .slice(0, topLimit);

  return filtered.map((row) => {
    const title = normalizeWhitespace(row.Name ?? 'Unknown game');
    const externalId = normalizeWhitespace(row.BGGId ?? '');
    const baseSlug = slugify(title);
    let slug = baseSlug;
    if (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${externalId}`;
    }
    usedSlugs.add(slug);

    const com = parseNumber(row.ComMinPlaytime);
    const mfg = parseNumber(row.MfgPlaytime);
    const playTimeMin = com ?? mfg;
    const playTimeMax =
      mfg != null && (playTimeMin == null || mfg !== playTimeMin) ? mfg : null;

    return {
      slug,
      title,
      description: sanitizeDescription(row.Description),
      yearPublished: parseNumber(row.YearPublished),
      minPlayers: parseNumber(row.MinPlayers),
      maxPlayers: parseNumber(row.MaxPlayers),
      playTimeMin,
      playTimeMax,
      complexity: parseFloatValue(row.GameWeight),
      imageUrl: row.ImagePath?.trim() || null,
      externalId,
      genreSlugs: genreSlugsFromRow(row),
    };
  });
}

export const FALLBACK_GAMES: ImportedGameRow[] = [
  {
    slug: 'wingspan',
    title: 'Wingspan',
    description:
      'A competitive bird-collection engine-builder. Play bird cards to habitats and chain abilities.',
    yearPublished: 2019,
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMin: 70,
    playTimeMax: 90,
    complexity: 2.46,
    imageUrl:
      'https://cf.geekdo-images.com/WNNBYW7KgDjnErJhHdhU3A__thumb/img/PlzEsPMyAUCGWaQrP7vJbZWe3E8=/fit-in/200x150/filters:strip_icc()/pic4458123.jpg',
    externalId: '266192',
    genreSlugs: ['engine', 'family'],
  },
  {
    slug: 'terraforming-mars',
    title: 'Terraforming Mars',
    description:
      'Corporations compete to raise temperature, oxygen, and oceans until Mars is habitable.',
    yearPublished: 2016,
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMin: 120,
    playTimeMax: 180,
    complexity: 3.24,
    imageUrl:
      'https://cf.geekdo-images.com/wg9oOLcsKvDesSUdZQ4rxA__thumb/img/BTxNxnNNJYK2rxFA6ms8iRp5RfA=/fit-in/200x150/filters:strip_icc()/pic3536616.jpg',
    externalId: '167791',
    genreSlugs: ['strategy', 'scifi'],
  },
  {
    slug: 'azul',
    title: 'Azul',
    description:
      'Draft tiles to decorate the walls of the Royal Palace of Evora in this abstract puzzle game.',
    yearPublished: 2017,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMin: 45,
    playTimeMax: 60,
    complexity: 0.96,
    imageUrl:
      'https://cf.geekdo-images.com/tzhr7YdvclevRikHAmC1Ew__thumb/img/3JIWFMJ5HV2R672nlOZCNcWG6bY=/fit-in/200x150/filters:strip_icc()/pic3718275.jpg',
    externalId: '230802',
    genreSlugs: ['family'],
  },
  {
    slug: 'catan',
    title: 'Catan',
    description:
      'Collect resources, trade, and build roads and settlements on the island of Catan.',
    yearPublished: 1995,
    minPlayers: 3,
    maxPlayers: 4,
    playTimeMin: 90,
    playTimeMax: 120,
    complexity: 2.3,
    imageUrl:
      'https://cf.geekdo-images.com/3OV-f1QXyZn7C9YnzaE8yw__thumb/img/hbVp_Ejv1F7SDaioAuLy8SZFWig=/fit-in/200x150/filters:strip_icc()/pic2419373.jpg',
    externalId: '13',
    genreSlugs: ['family', 'strategy'],
  },
  {
    slug: 'spirit-island',
    title: 'Spirit Island',
    description:
      'Cooperative defense of an island from colonizers, each player is a unique spirit with powers.',
    yearPublished: 2017,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMin: 120,
    playTimeMax: 180,
    complexity: 4.06,
    imageUrl:
      'https://cf.geekdo-images.com/6PqpIERS_KTI4QFdOaaeLA__thumb/img/VeY2Ar9Lec-Vwf7kh_WO-wtHoUI=/fit-in/200x150/filters:strip_icc()/pic3446697.jpg',
    externalId: '162886',
    genreSlugs: ['thematic', 'strategy'],
  },
];
