import type { PrismaClient } from '@prisma/client';

export const GAME_GENRES_SEED = [
  { slug: 'strategy', name: 'Strategy' },
  { slug: 'thematic', name: 'Thematic' },
  { slug: 'family', name: 'Family' },
  { slug: 'scifi', name: 'Sci-Fi' },
  { slug: 'fantasy', name: 'Fantasy' },
  { slug: 'engine', name: 'Engine Building' },
] as const;

export async function seedGenres(prisma: PrismaClient) {
  for (const row of GAME_GENRES_SEED) {
    await prisma.gameGenre.upsert({
      where: { slug: row.slug },
      create: { slug: row.slug, name: row.name },
      update: { name: row.name },
    });
  }
  console.log(`Seeded ${GAME_GENRES_SEED.length} game genres.`);
}

export async function linkGameGenres(
  prisma: PrismaClient,
  gameId: string,
  genreSlugs: string[],
) {
  await prisma.boardGameGenre.deleteMany({ where: { gameId } });
  for (const genreSlug of genreSlugs) {
    const genre = await prisma.gameGenre.findUnique({
      where: { slug: genreSlug },
    });
    if (!genre) {
      continue;
    }
    await prisma.boardGameGenre.create({
      data: { gameId, genreId: genre.id },
    });
  }
}
