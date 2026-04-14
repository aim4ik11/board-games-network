import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { GameRatingsRepositoryPort } from '../../domain/ports/game-ratings.repository.port';
import type {
  DeleteRatingResult,
  RatingUpsertResult,
} from '../../domain/types/game.types';

const upsertSelect = {
  id: true,
  score: true,
  userId: true,
  gameId: true,
} as const;

@Injectable()
export class PrismaGameRatingsRepository extends GameRatingsRepositoryPort {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async upsertRatingByGameSlug(params: {
    slug: string;
    userId: string;
    score: number;
  }): Promise<RatingUpsertResult | null> {
    return this.prismaService.$transaction(async (tx) => {
      const game = await tx.boardGame.findUnique({
        where: { slug: params.slug },
        select: { id: true },
      });
      if (!game) {
        return null;
      }
      const row = await tx.rating.upsert({
        where: {
          userId_gameId: {
            userId: params.userId,
            gameId: game.id,
          },
        },
        create: {
          userId: params.userId,
          gameId: game.id,
          score: params.score,
        },
        update: { score: params.score },
        select: upsertSelect,
      });
      return row as RatingUpsertResult;
    });
  }

  async deleteRatingByGameSlug(params: {
    slug: string;
    userId: string;
  }): Promise<DeleteRatingResult> {
    return this.prismaService.$transaction(async (tx) => {
      const game = await tx.boardGame.findUnique({
        where: { slug: params.slug },
        select: { id: true },
      });
      if (!game) {
        return 'no_game';
      }
      try {
        await tx.rating.delete({
          where: {
            userId_gameId: {
              userId: params.userId,
              gameId: game.id,
            },
          },
        });
        return 'deleted';
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2025'
        ) {
          return 'not_found';
        }
        throw e;
      }
    });
  }
}
