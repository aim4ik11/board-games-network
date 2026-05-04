import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '@boardgame/shared';
import type {
  CreateGameProps,
  UpdateGamePatch,
} from '../domain/types/game.types';
import { PrismaBoardGamesRepository } from '../infrastructure/persistence/prisma-board-games.repository';
import { PrismaGameRatingsRepository } from '../infrastructure/persistence/prisma-game-ratings.repository';
import { PrismaGameReviewsRepository } from '../infrastructure/persistence/prisma-game-reviews.repository';

export type ListGamesParams = {
  titleSearch?: string;
  page: number;
  limit: number;
};

export type ListReviewsParams = {
  slug: string;
  page: number;
  limit: number;
};

@Injectable()
export class GamesApplicationService {
  constructor(
    private readonly boardGamesRepository: PrismaBoardGamesRepository,
    private readonly gameReviewsRepository: PrismaGameReviewsRepository,
    private readonly gameRatingsRepository: PrismaGameRatingsRepository,
  ) {}

  async listGames(query: ListGamesParams) {
    const skip = (query.page - 1) * query.limit;
    const { items, total } =
      await this.boardGamesRepository.findPaginatedForList({
        titleSearch: query.titleSearch,
        skip,
        take: query.limit,
      });

    return {
      data: items,
      meta: { total, page: query.page, limit: query.limit },
    };
  }

  async getGameBySlug(slug: string) {
    const row = await this.boardGamesRepository.findWithRatingStatsBySlug(slug);
    if (!row) {
      throw new NotFoundException('Game not found');
    }
    return row;
  }

  createGame(props: CreateGameProps) {
    return this.boardGamesRepository.createGame(props);
  }

  async updateGame(slug: string, patch: UpdateGamePatch) {
    const game = await this.boardGamesRepository.updateGameBySlug(slug, patch);
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return game;
  }

  async deleteGame(slug: string) {
    const ok = await this.boardGamesRepository.deleteGameBySlug(slug);
    if (!ok) {
      throw new NotFoundException('Game not found');
    }
    return { ok: true };
  }

  async listReviews(params: ListReviewsParams) {
    const skip = (params.page - 1) * params.limit;
    const result = await this.gameReviewsRepository.findPaginatedByGameSlug({
      slug: params.slug,
      skip,
      take: params.limit,
    });
    if (!result) {
      throw new NotFoundException('Game not found');
    }

    return {
      data: result.items,
      meta: {
        total: result.total,
        page: params.page,
        limit: params.limit,
      },
    };
  }

  async createReview(slug: string, user: AuthUser, body: string) {
    try {
      const row = await this.gameReviewsRepository.createReviewByGameSlug({
        slug,
        userId: user.id,
        body,
      });
      if (!row) {
        throw new NotFoundException('Game not found');
      }
      return row;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('You already reviewed this game');
      }
      throw e;
    }
  }

  async updateReview(slug: string, user: AuthUser, body: string) {
    const row = await this.gameReviewsRepository.updateReviewByGameSlug({
      slug,
      userId: user.id,
      body,
    });
    if (!row) {
      throw new NotFoundException('Game or review not found');
    }
    return row;
  }

  async deleteReview(slug: string, user: AuthUser) {
    const ok = await this.gameReviewsRepository.deleteReviewByGameSlug({
      slug,
      userId: user.id,
    });
    if (!ok) {
      throw new NotFoundException('Game or review not found');
    }
    return { ok: true };
  }

  async upsertRating(slug: string, user: AuthUser, score: number) {
    const row = await this.gameRatingsRepository.upsertRatingByGameSlug({
      slug,
      userId: user.id,
      score,
    });
    if (!row) {
      throw new NotFoundException('Game not found');
    }
    return row;
  }

  async deleteRating(slug: string, user: AuthUser) {
    const result = await this.gameRatingsRepository.deleteRatingByGameSlug({
      slug,
      userId: user.id,
    });
    if (result === 'no_game') {
      throw new NotFoundException('Game not found');
    }
    if (result === 'not_found') {
      throw new NotFoundException('Rating not found');
    }
    return { ok: true };
  }
}
