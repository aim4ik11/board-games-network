import type { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { SeedConfig } from './config';
import { createRng } from './random';
import type { SeededGame } from './games';
import type { SeededUser } from './users';

function fillTemplate(template: string, gameTitle: string) {
  return template.replaceAll('{gameTitle}', gameTitle);
}

export async function seedReviewsAndRatings(
  prisma: PrismaClient,
  config: SeedConfig,
  users: SeededUser[],
  games: SeededGame[],
) {
  const rng = createRng(config.rngSeed + 17);
  const reviewBodies = await loadJson<string[]>('review-bodies.json');

  let ratingCount = 0;
  let reviewCount = 0;

  for (const user of users) {
    const ratingTarget = rng.int(
      config.ratingsPerUserMin,
      Math.min(config.ratingsPerUserMax, games.length),
    );
    const ratedGames = rng.shuffle(games).slice(0, ratingTarget);

    for (const game of ratedGames) {
      const score = rng.int(2, 5);

      await prisma.rating.upsert({
        where: {
          userId_gameId: { userId: user.id, gameId: game.id },
        },
        create: { userId: user.id, gameId: game.id, score },
        update: { score },
      });
      ratingCount += 1;

      if (rng.chance(config.reviewChance)) {
        const body = fillTemplate(rng.pick(reviewBodies), game.title);
        await prisma.review.upsert({
          where: {
            userId_gameId: { userId: user.id, gameId: game.id },
          },
          create: {
            userId: user.id,
            gameId: game.id,
            body,
            imageUrls: [],
          },
          update: { body },
        });
        reviewCount += 1;
      }
    }
  }

  console.log(`Seeded ${ratingCount} ratings and ${reviewCount} reviews.`);
}

async function loadJson<T>(fileName: string): Promise<T> {
  const filePath = path.join(__dirname, 'data', fileName);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}
