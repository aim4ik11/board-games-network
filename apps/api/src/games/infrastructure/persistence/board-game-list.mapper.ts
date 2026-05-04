import type { Prisma } from '@prisma/client';
import type { GameListItem } from '@boardgame/shared';

/** Prisma select shape aligned with wire `GameListItem`. */
export const boardGameListSelect = {
  id: true,
  slug: true,
  title: true,
  yearPublished: true,
  minPlayers: true,
  maxPlayers: true,
  playTimeMin: true,
  imageUrl: true,
} as const;

export type BoardGameListRow = Prisma.BoardGameGetPayload<{
  select: typeof boardGameListSelect;
}>;

export function boardGameListRowToItem(row: BoardGameListRow): GameListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    yearPublished: row.yearPublished,
    minPlayers: row.minPlayers,
    maxPlayers: row.maxPlayers,
    playTimeMin: row.playTimeMin,
    imageUrl: row.imageUrl,
  };
}
