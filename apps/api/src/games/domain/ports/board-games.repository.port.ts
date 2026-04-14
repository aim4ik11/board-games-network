import { Injectable } from '@nestjs/common';
import type {
  BoardGameListItem,
  BoardGameRecord,
  CreateGameProps,
  GameDetailWithStats,
  UpdateGamePatch,
} from '../types/game.types';

@Injectable()
export abstract class BoardGamesRepositoryPort {
  abstract findPaginatedForList(params: {
    titleSearch?: string;
    skip: number;
    take: number;
  }): Promise<{ items: BoardGameListItem[]; total: number }>;

  abstract findWithRatingStatsBySlug(
    slug: string,
  ): Promise<GameDetailWithStats | null>;

  abstract createGame(data: CreateGameProps): Promise<BoardGameRecord>;

  abstract updateGameBySlug(
    slug: string,
    patch: UpdateGamePatch,
  ): Promise<BoardGameRecord | null>;

  abstract deleteGameBySlug(slug: string): Promise<boolean>;

  abstract findIdBySlug(slug: string): Promise<string | null>;
}
