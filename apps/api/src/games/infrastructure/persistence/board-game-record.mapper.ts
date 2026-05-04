import type { BoardGame } from '@prisma/client';
import type { BoardGameRecord } from '../../domain/types/game.types';

export function prismaBoardGameToRecord(boardGame: BoardGame): BoardGameRecord {
  return {
    id: boardGame.id,
    slug: boardGame.slug,
    title: boardGame.title,
    yearPublished: boardGame.yearPublished,
    minPlayers: boardGame.minPlayers,
    maxPlayers: boardGame.maxPlayers,
    playTimeMin: boardGame.playTimeMin,
    imageUrl: boardGame.imageUrl,
    description: boardGame.description,
    externalId: boardGame.externalId,
    createdAt: boardGame.createdAt,
    updatedAt: boardGame.updatedAt,
  };
}
