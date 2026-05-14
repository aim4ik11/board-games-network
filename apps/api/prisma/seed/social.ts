import {
  CollectionStatus,
  FriendshipStatus,
  type PrismaClient,
} from '@prisma/client';
import type { SeedConfig } from './config';
import { createRng } from './random';
import type { SeededGame } from './games';
import type { SeededUser } from './users';

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function seedSocial(
  prisma: PrismaClient,
  config: SeedConfig,
  users: SeededUser[],
  games: SeededGame[],
) {
  const rng = createRng(config.rngSeed);
  const friendshipPairs = new Set<string>();
  let friendshipCount = 0;
  let pendingCount = 0;

  for (const user of users) {
    const targetCount = rng.int(
      config.friendshipsPerUserMin,
      config.friendshipsPerUserMax,
    );
    const candidates = rng
      .shuffle(users.filter((candidate) => candidate.id !== user.id))
      .slice(0, targetCount);

    for (const friend of candidates) {
      const [requesterId, addresseeId] = canonicalPair(user.id, friend.id);
      const key = `${requesterId}:${addresseeId}`;
      if (friendshipPairs.has(key)) {
        continue;
      }
      friendshipPairs.add(key);

      const status = rng.chance(0.12)
        ? FriendshipStatus.PENDING
        : FriendshipStatus.ACCEPTED;

      await prisma.friendship.upsert({
        where: {
          requesterId_addresseeId: { requesterId, addresseeId },
        },
        create: { requesterId, addresseeId, status },
        update: { status },
      });

      if (status === FriendshipStatus.ACCEPTED) {
        friendshipCount += 1;
      } else {
        pendingCount += 1;
      }
    }
  }

  let collectionCount = 0;
  const statuses = [
    CollectionStatus.OWNED,
    CollectionStatus.WISHLIST,
    CollectionStatus.PREVIOUSLY_OWNED,
  ] as const;

  for (const user of users) {
    const pickCount = rng.int(
      config.collectionPerUserMin,
      Math.min(config.collectionPerUserMax, games.length),
    );
    const pickedGames = rng.shuffle(games).slice(0, pickCount);

    for (const game of pickedGames) {
      const status = rng.pick(statuses);
      await prisma.userGame.upsert({
        where: {
          userId_gameId: { userId: user.id, gameId: game.id },
        },
        create: {
          userId: user.id,
          gameId: game.id,
          status,
          notes:
            status === CollectionStatus.OWNED
              ? rng.chance(0.35)
                ? 'Purchased at local game store.'
                : null
              : null,
          acquiredAt:
            status === CollectionStatus.OWNED && rng.chance(0.7)
              ? new Date(
                  Date.now() -
                    rng.int(14, 900) * 24 * 60 * 60 * 1000,
                )
              : null,
        },
        update: { status },
      });
      collectionCount += 1;
    }
  }

  console.log(
    `Seeded ${friendshipCount} accepted and ${pendingCount} pending friendships.`,
  );
  console.log(`Seeded ${collectionCount} collection entries.`);
}
