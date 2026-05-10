import type { BoardGame, BoardGameGenre, GameGenre } from '@prisma/client';
import type { BoardGameRecord } from '../../domain/types/game.types';

type BoardGameWithGenres = BoardGame & {
  genres: (BoardGameGenre & { genre: GameGenre })[];
};

function isBoardGameWithGenres(
  boardGame: BoardGame | BoardGameWithGenres,
): boardGame is BoardGameWithGenres {
  return 'genres' in boardGame && Array.isArray(boardGame.genres);
}

export function prismaBoardGameToRecord(
  boardGame: BoardGame | BoardGameWithGenres,
): BoardGameRecord {
  const genres = isBoardGameWithGenres(boardGame)
    ? boardGame.genres.map((g) => ({
        slug: g.genre.slug,
        name: g.genre.name,
      }))
    : [];

  return {
    id: boardGame.id,
    slug: boardGame.slug,
    title: boardGame.title,
    yearPublished: boardGame.yearPublished,
    minPlayers: boardGame.minPlayers,
    maxPlayers: boardGame.maxPlayers,
    playTimeMin: boardGame.playTimeMin,
    playTimeMax: boardGame.playTimeMax,
    complexity: boardGame.complexity,
    genres,
    imageUrl: boardGame.imageUrl,
    description: boardGame.description,
    externalId: boardGame.externalId,
    createdAt: boardGame.createdAt,
    updatedAt: boardGame.updatedAt,
  };
}
