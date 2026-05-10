import type { Prisma } from '@prisma/client';
import type { GameListItem } from '@boardgame/shared';

/** Prisma select shape aligned with wire `GameListItem`. */
export const boardGameListSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  yearPublished: true,
  minPlayers: true,
  maxPlayers: true,
  playTimeMin: true,
  playTimeMax: true,
  complexity: true,
  imageUrl: true,
  genres: {
    select: {
      genre: { select: { slug: true, name: true } },
    },
  },
} as const;

export type BoardGameListRow = Prisma.BoardGameGetPayload<{
  select: typeof boardGameListSelect;
}>;

export function boardGameListRowToItem(row: BoardGameListRow): GameListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    yearPublished: row.yearPublished,
    minPlayers: row.minPlayers,
    maxPlayers: row.maxPlayers,
    playTimeMin: row.playTimeMin,
    playTimeMax: row.playTimeMax,
    complexity: row.complexity,
    genres: row.genres.map((g) => ({
      slug: g.genre.slug,
      name: g.genre.name,
    })),
    imageUrl: row.imageUrl,
  };
}
