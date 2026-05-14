import type { PrismaClient } from '@prisma/client';
import type { SeedConfig } from './config';
import {
  buildImportedGameRows,
  FALLBACK_GAMES,
  loadDatasetRows,
  readDatasetCsvText,
  type ImportedGameRow,
} from './dataset';
import { linkGameGenres } from './genres';

export type SeededGame = {
  id: string;
  slug: string;
  title: string;
};

async function upsertImportedGames(
  prisma: PrismaClient,
  rows: ImportedGameRow[],
): Promise<SeededGame[]> {
  const seeded: SeededGame[] = [];

  for (const row of rows) {
    const { genreSlugs, ...gameData } = row;
    const game = await prisma.boardGame.upsert({
      where: { externalId: row.externalId },
      create: gameData,
      update: {
        title: gameData.title,
        description: gameData.description,
        yearPublished: gameData.yearPublished,
        minPlayers: gameData.minPlayers,
        maxPlayers: gameData.maxPlayers,
        playTimeMin: gameData.playTimeMin,
        playTimeMax: gameData.playTimeMax,
        complexity: gameData.complexity,
        imageUrl: gameData.imageUrl,
        slug: gameData.slug,
      },
      select: { id: true, slug: true, title: true },
    });
    await linkGameGenres(prisma, game.id, genreSlugs);
    seeded.push(game);
  }

  return seeded;
}

async function pruneGamesOutsideImport(
  prisma: PrismaClient,
  rows: ImportedGameRow[],
) {
  const keepIds = rows.map((row) => row.externalId);
  const removed = await prisma.boardGame.deleteMany({
    where: {
      externalId: {
        notIn: keepIds,
      },
    },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} games outside the seed set.`);
  }
}

export async function seedGames(
  prisma: PrismaClient,
  config: SeedConfig,
): Promise<SeededGame[]> {
  try {
    const csvText = await readDatasetCsvText();
    const parsedRows = loadDatasetRows(csvText);
    const imported = buildImportedGameRows(
      parsedRows,
      config.topGamesLimit,
      config.minUserRatings,
    );
    if (imported.length === 0) {
      throw new Error(
        'Dataset parsed but produced zero valid ranked board games',
      );
    }
    const games = await upsertImportedGames(prisma, imported);
    if (config.pruneGames) {
      await pruneGamesOutsideImport(prisma, imported);
    }
    console.log(
      `Seeded ${games.length} board games from local CSV dataset (top ${config.topGamesLimit}).`,
    );
    return games;
  } catch (error) {
    if (config.datasetStrict) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(
      `Dataset import failed, using fallback games instead. Reason: ${message}`,
    );
    const games = await upsertImportedGames(prisma, FALLBACK_GAMES);
    if (config.pruneGames) {
      await pruneGamesOutsideImport(prisma, FALLBACK_GAMES);
    }
    console.log(`Seeded ${games.length} fallback board games.`);
    return games;
  }
}
