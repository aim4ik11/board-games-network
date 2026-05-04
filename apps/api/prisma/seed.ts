import { PrismaClient } from '@prisma/client';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse } from 'csv-parse/sync';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEFAULT_DATASET_ZIP = 'games.csv.zip';
const DEFAULT_DATASET_CSV = 'games.csv';
const DEFAULT_TOP_LIMIT = 400;
const DEFAULT_MIN_USER_RATINGS = 500;
const DEFAULT_SEED_PLAYERS_COUNT = 24;
const DEFAULT_SEED_PLAYER_PASSWORD = 'password123';

type DatasetRow = {
  BGGId?: string;
  Name?: string;
  Description?: string;
  YearPublished?: string;
  MinPlayers?: string;
  MaxPlayers?: string;
  ComMinPlaytime?: string;
  MfgPlaytime?: string;
  ImagePath?: string;
  'Rank:boardgame'?: string;
  NumUserRatings?: string;
};

const games = [
  {
    slug: 'wingspan',
    title: 'Wingspan',
    description:
      'A competitive bird-collection engine-builder. Play bird cards to habitats and chain abilities.',
    yearPublished: 2019,
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMin: 70,
    imageUrl:
      'https://cf.geekdo-images.com/WNNBYW7KgDjnErJhHdhU3A__thumb/img/PlzEsPMyAUCGWaQrP7vJbZWe3E8=/fit-in/200x150/filters:strip_icc()/pic4458123.jpg',
    externalId: '266192',
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
    imageUrl:
      'https://cf.geekdo-images.com/wg9oOLcsKvDesSUdZQ4rxA__thumb/img/BTxNxnNNJYK2rxFA6ms8iRp5RfA=/fit-in/200x150/filters:strip_icc()/pic3536616.jpg',
    externalId: '167791',
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
    imageUrl:
      'https://cf.geekdo-images.com/tzhr7YdvclevRikHAmC1Ew__thumb/img/3JIWFMJ5HV2R672nlOZCNcWG6bY=/fit-in/200x150/filters:strip_icc()/pic3718275.jpg',
    externalId: '230802',
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
    imageUrl:
      'https://cf.geekdo-images.com/3OV-f1QXyZn7C9YnzaE8yw__thumb/img/hbVp_Ejv1F7SDaioAuLy8SZFWig=/fit-in/200x150/filters:strip_icc()/pic2419373.jpg',
    externalId: '13',
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
    imageUrl:
      'https://cf.geekdo-images.com/6PqpIERS_KTI4QFdOaaeLA__thumb/img/VeY2Ar9Lec-Vwf7kh_WO-wtHoUI=/fit-in/200x150/filters:strip_icc()/pic3446697.jpg',
    externalId: '162886',
  },
];

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value.length === 0) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(input: string): string {
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

async function seedFallbackGames() {
  for (const g of games) {
    const { slug, ...rest } = g;
    await prisma.boardGame.upsert({
      where: { slug },
      create: { slug, ...rest },
      update: { ...rest },
    });
  }
  console.log(`Seeded ${games.length} fallback board games.`);
}

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

async function readDatasetCsvText(): Promise<string> {
  const { zipPath, csvPath } = getDatasetPaths();

  if (existsSync(csvPath)) {
    return readFile(csvPath, 'utf-8');
  }

  if (!existsSync(zipPath)) {
    throw new Error(
      `No dataset found. Expected CSV at ${csvPath} or ZIP at ${zipPath}.`,
    );
  }

  const csvFromZip = execFileSync(
    'unzip',
    ['-p', zipPath, DEFAULT_DATASET_CSV],
    {
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 256,
    },
  );
  return csvFromZip;
}

function loadDatasetRows(text: string): DatasetRow[] {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
  });
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

function buildSeedRows(rows: DatasetRow[]) {
  const topLimit = Number.parseInt(
    process.env.BOARDGAMES_TOP_LIMIT ?? `${DEFAULT_TOP_LIMIT}`,
    10,
  );
  const minRatings = Number.parseInt(
    process.env.BOARDGAMES_MIN_USER_RATINGS ?? `${DEFAULT_MIN_USER_RATINGS}`,
    10,
  );
  const safeTopLimit =
    Number.isFinite(topLimit) && topLimit > 0 ? topLimit : DEFAULT_TOP_LIMIT;
  const safeMinRatings =
    Number.isFinite(minRatings) && minRatings >= 0
      ? minRatings
      : DEFAULT_MIN_USER_RATINGS;
  const usedSlugs = new Set<string>();

  const filtered = rows
    .filter((row) => {
      const rank = parseNumber(row['Rank:boardgame']);
      const ratings = parseNumber(row.NumUserRatings);
      return (
        rank !== null &&
        rank > 0 &&
        ratings !== null &&
        ratings >= safeMinRatings &&
        row.BGGId !== undefined &&
        row.Name !== undefined
      );
    })
    .sort(
      (a, b) =>
        (parseNumber(a['Rank:boardgame']) ?? 999999) -
        (parseNumber(b['Rank:boardgame']) ?? 999999),
    )
    .slice(0, safeTopLimit);

  return filtered.map((row) => {
    const title = normalizeWhitespace(row.Name ?? 'Unknown game');
    const externalId = normalizeWhitespace(row.BGGId ?? '');
    const baseSlug = slugify(title);
    let slug = baseSlug;
    if (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${externalId}`;
    }
    usedSlugs.add(slug);

    return {
      slug,
      title,
      description: sanitizeDescription(row.Description),
      yearPublished: parseNumber(row.YearPublished),
      minPlayers: parseNumber(row.MinPlayers),
      maxPlayers: parseNumber(row.MaxPlayers),
      playTimeMin:
        parseNumber(row.ComMinPlaytime) ?? parseNumber(row.MfgPlaytime),
      imageUrl: row.ImagePath?.trim() || null,
      externalId,
    };
  });
}

async function upsertImportedGames(
  rows: Array<{
    slug: string;
    title: string;
    description: string;
    yearPublished: number | null;
    minPlayers: number | null;
    maxPlayers: number | null;
    playTimeMin: number | null;
    imageUrl: string | null;
    externalId: string;
  }>,
) {
  let written = 0;
  for (const row of rows) {
    await prisma.boardGame.upsert({
      where: { externalId: row.externalId },
      create: row,
      update: {
        title: row.title,
        description: row.description,
        yearPublished: row.yearPublished,
        minPlayers: row.minPlayers,
        maxPlayers: row.maxPlayers,
        playTimeMin: row.playTimeMin,
        imageUrl: row.imageUrl,
        slug: row.slug,
      },
    });
    written += 1;
  }
  return written;
}

const playerFirstNames = [
  'Alex',
  'Jordan',
  'Taylor',
  'Morgan',
  'Casey',
  'Riley',
  'Jamie',
  'Drew',
  'Sam',
  'Cameron',
  'Avery',
  'Quinn',
];

const playerLastNames = [
  'Smith',
  'Johnson',
  'Brown',
  'Lee',
  'Patel',
  'Miller',
  'Garcia',
  'Davis',
  'Anderson',
  'Wilson',
  'Martin',
  'Clark',
];

function shouldSeedPlayers(): boolean {
  const value = process.env.SEED_PLAYERS?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function getPlayerSeedCount(): number {
  const parsed = Number.parseInt(
    process.env.SEED_PLAYERS_COUNT ?? `${DEFAULT_SEED_PLAYERS_COUNT}`,
    10,
  );
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SEED_PLAYERS_COUNT;
  }
  return parsed;
}

function buildPlayerSeedRows(count: number) {
  return Array.from({ length: count }, (_, idx) => {
    const first = playerFirstNames[idx % playerFirstNames.length];
    const last =
      playerLastNames[
        Math.floor(idx / playerFirstNames.length) % playerLastNames.length
      ];
    const sequence = idx + 1;
    const email = `player${sequence}@seed.local`;
    return {
      email,
      displayName: `${first} ${last}`,
      city: `City ${((idx % 10) + 1).toString()}`,
      bio: `Board game fan #${sequence}.`,
    };
  });
}

async function seedPlayers() {
  if (!shouldSeedPlayers()) {
    return;
  }

  const count = getPlayerSeedCount();
  const plainPassword =
    process.env.SEED_PLAYERS_PASSWORD ?? DEFAULT_SEED_PLAYER_PASSWORD;
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const players = buildPlayerSeedRows(count);

  for (const player of players) {
    await prisma.user.upsert({
      where: { email: player.email },
      create: {
        email: player.email,
        displayName: player.displayName,
        passwordHash,
        city: player.city,
        bio: player.bio,
      },
      update: {
        displayName: player.displayName,
        passwordHash,
        city: player.city,
        bio: player.bio,
      },
    });
  }

  console.log(`Seeded ${players.length} players.`);
}

async function main() {
  await seedPlayers();
  const strict = process.env.BOARDGAMES_DATASET_STRICT === '1';
  try {
    const csvText = await readDatasetCsvText();
    const parsedRows = loadDatasetRows(csvText);
    const imported = buildSeedRows(parsedRows);
    if (imported.length === 0) {
      throw new Error(
        'Dataset parsed but produced zero valid ranked board games',
      );
    }
    const written = await upsertImportedGames(imported);
    console.log(`Seeded ${written} board games from local CSV dataset.`);
  } catch (error) {
    if (strict) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(
      `Dataset import failed, using fallback games instead. Reason: ${message}`,
    );
    await seedFallbackGames();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
