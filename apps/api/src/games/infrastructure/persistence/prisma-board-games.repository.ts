import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { slugifyTitle } from '../../domain/utils/slug.util';
import type {
  BoardGameListItem,
  BoardGameRecord,
  CreateGameProps,
  GameDetailWithStats,
  UpdateGamePatch,
} from '../../domain/types/game.types';

const listSelect = {
  id: true,
  slug: true,
  title: true,
  yearPublished: true,
  minPlayers: true,
  maxPlayers: true,
  playTimeMin: true,
  imageUrl: true,
} as const;

@Injectable()
export class PrismaBoardGamesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findPaginatedForList(params: {
    titleSearch?: string;
    skip: number;
    take: number;
  }): Promise<{ items: BoardGameListItem[]; total: number }> {
    const where: Prisma.BoardGameWhereInput = params.titleSearch?.trim()
      ? {
          title: {
            contains: params.titleSearch.trim(),
            mode: 'insensitive',
          },
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prismaService.boardGame.findMany({
        where,
        orderBy: { title: 'asc' },
        skip: params.skip,
        take: params.take,
        select: listSelect,
      }),
      this.prismaService.boardGame.count({ where }),
    ]);

    return { items: rows as BoardGameListItem[], total };
  }

  async findWithRatingStatsBySlug(
    slug: string,
  ): Promise<GameDetailWithStats | null> {
    const game = await this.prismaService.boardGame.findUnique({
      where: { slug },
    });
    if (!game) {
      return null;
    }
    const [agg, reviewCount] = await Promise.all([
      this.prismaService.rating.aggregate({
        where: { gameId: game.id },
        _avg: { score: true },
        _count: { _all: true },
      }),
      this.prismaService.review.count({ where: { gameId: game.id } }),
    ]);

    return {
      ...(game as BoardGameRecord),
      averageRating: agg._avg.score,
      ratingCount: agg._count._all,
      reviewCount,
    };
  }

  async createGame(data: CreateGameProps): Promise<BoardGameRecord> {
    const base = slugifyTitle(data.title);
    const slug = await this.allocateUniqueSlug(base);
    const created = await this.prismaService.boardGame.create({
      data: {
        slug,
        title: data.title,
        description: data.description,
        yearPublished: data.yearPublished,
        minPlayers: data.minPlayers,
        maxPlayers: data.maxPlayers,
        playTimeMin: data.playTimeMin,
        imageUrl: data.imageUrl,
        externalId: data.externalId,
      },
    });
    return created as BoardGameRecord;
  }

  async updateGameBySlug(
    slug: string,
    patch: UpdateGamePatch,
  ): Promise<BoardGameRecord | null> {
    const existing = await this.prismaService.boardGame.findUnique({
      where: { slug },
    });
    if (!existing) {
      return null;
    }

    let nextSlug = existing.slug;
    if (patch.title !== undefined && patch.title !== existing.title) {
      const base = slugifyTitle(patch.title);
      nextSlug = await this.allocateUniqueSlug(base, existing.id);
    }

    const updated = await this.prismaService.boardGame.update({
      where: { id: existing.id },
      data: {
        ...(patch.title !== undefined && {
          title: patch.title,
          slug: nextSlug,
        }),
        ...(patch.description !== undefined && {
          description: patch.description,
        }),
        ...(patch.yearPublished !== undefined && {
          yearPublished: patch.yearPublished,
        }),
        ...(patch.minPlayers !== undefined && {
          minPlayers: patch.minPlayers,
        }),
        ...(patch.maxPlayers !== undefined && {
          maxPlayers: patch.maxPlayers,
        }),
        ...(patch.playTimeMin !== undefined && {
          playTimeMin: patch.playTimeMin,
        }),
        ...(patch.imageUrl !== undefined && { imageUrl: patch.imageUrl }),
        ...(patch.externalId !== undefined && {
          externalId: patch.externalId,
        }),
      },
    });
    return updated as BoardGameRecord;
  }

  async deleteGameBySlug(slug: string): Promise<boolean> {
    const row = await this.prismaService.boardGame.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!row) {
      return false;
    }
    await this.prismaService.boardGame.delete({ where: { id: row.id } });
    return true;
  }

  async findIdBySlug(slug: string): Promise<string | null> {
    const row = await this.prismaService.boardGame.findUnique({
      where: { slug },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  private async allocateUniqueSlug(
    base: string,
    excludeGameId?: string,
  ): Promise<string> {
    let candidate = base;
    let n = 0;
    for (;;) {
      const found = await this.prismaService.boardGame.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!found || found.id === excludeGameId) {
        return candidate;
      }
      n += 1;
      candidate = `${base}-${n}`;
    }
  }
}
