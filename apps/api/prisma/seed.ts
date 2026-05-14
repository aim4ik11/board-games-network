import { PrismaClient } from '@prisma/client';
import { loadSeedConfig } from './seed/config';
import { seedChat } from './seed/chat';
import { seedGames } from './seed/games';
import { seedGenres } from './seed/genres';
import { seedMeetups } from './seed/meetups';
import { seedReviewsAndRatings } from './seed/reviews';
import { seedSocial } from './seed/social';
import { seedUsers } from './seed/users';

const prisma = new PrismaClient();

async function main() {
  const config = loadSeedConfig();

  await seedGenres(prisma);
  const games = await seedGames(prisma, config);

  if (!config.mockData) {
    console.log('SEED_MOCK_DATA disabled — skipping users and social mock data.');
    return;
  }

  const users = await seedUsers(prisma, config);
  await seedSocial(prisma, config, users, games);
  await seedReviewsAndRatings(prisma, config, users, games);
  await seedMeetups(prisma, config, users, games);
  await seedChat(prisma, config, users);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
