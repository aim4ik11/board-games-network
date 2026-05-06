import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ReviewWithAuthorView } from '../../domain/types/game.types';

const reviewWithAuthorSelect = {
  id: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, displayName: true, avatarUrl: true },
  },
} as const;

@Injectable()
export class PrismaGameReviewsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findPaginatedByGameSlug(params: {
    slug: string;
    skip: number;
    take: number;
  }): Promise<{ items: ReviewWithAuthorView[]; total: number } | null> {
    const game = await this.prismaService.boardGame.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!game) {
      return null;
    }

    const where = { gameId: game.id };

    const [items, total] = await Promise.all([
      this.prismaService.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
        select: reviewWithAuthorSelect,
      }),
      this.prismaService.review.count({ where }),
    ]);

    return { items: items as ReviewWithAuthorView[], total };
  }

  createReviewByGameSlug(params: {
    slug: string;
    userId: string;
    body: string;
  }): Promise<ReviewWithAuthorView | null> {
    return this.prismaService
      .$transaction(async (tx) => {
        const game = await tx.boardGame.findUnique({
          where: { slug: params.slug },
          select: { id: true },
        });
        if (!game) {
          return null;
        }
        const row = await tx.review.create({
          data: {
            gameId: game.id,
            userId: params.userId,
            body: params.body,
          },
          select: reviewWithAuthorSelect,
        });
        return row as ReviewWithAuthorView;
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new DuplicateGameReviewError();
        }
        throw error;
      });
  }

  async updateReviewByGameSlug(params: {
    slug: string;
    userId: string;
    body: string;
  }): Promise<ReviewWithAuthorView | null> {
    return this.prismaService.$transaction(async (tx) => {
      const game = await tx.boardGame.findUnique({
        where: { slug: params.slug },
        select: { id: true },
      });
      if (!game) {
        return null;
      }
      const review = await tx.review.findUnique({
        where: {
          userId_gameId: { userId: params.userId, gameId: game.id },
        },
        select: { id: true },
      });
      if (!review) {
        return null;
      }
      const row = await tx.review.update({
        where: { id: review.id },
        data: { body: params.body },
        select: reviewWithAuthorSelect,
      });
      return row as ReviewWithAuthorView;
    });
  }

  async deleteReviewByGameSlug(params: {
    slug: string;
    userId: string;
  }): Promise<boolean> {
    return this.prismaService.$transaction(async (tx) => {
      const game = await tx.boardGame.findUnique({
        where: { slug: params.slug },
        select: { id: true },
      });
      if (!game) {
        return false;
      }
      const review = await tx.review.findUnique({
        where: {
          userId_gameId: { userId: params.userId, gameId: game.id },
        },
        select: { id: true },
      });
      if (!review) {
        return false;
      }
      await tx.review.delete({ where: { id: review.id } });
      return true;
    });
  }
}

export class DuplicateGameReviewError extends Error {}
