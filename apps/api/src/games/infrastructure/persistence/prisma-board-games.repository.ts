import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { GameListItem } from '@boardgame/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { slugifyTitle } from '../../domain/utils/slug.util';
import type {
  BoardGameRecord,
  CreateGameProps,
  GameDetailWithStats,
  UpdateGamePatch,
} from '../../domain/types/game.types';
import {
  boardGameListSelect,
  boardGameListRowToItem,
} from './board-game-list.mapper';
import { prismaBoardGameToRecord } from './board-game-record.mapper';
import type { ComplexityBandId } from './games-list-query.util';
import {
  complexityBandWhere,
  listGamesOrderBy,
  playtimeOverlapWhere,
} from './games-list-query.util';

export type ListGamesRepositoryParams = {
  titleSearch?: string;
  genreSlugs?: string[];
  filterPlayTimeMin?: number;
  filterPlayTimeMax?: number;
  complexityBands?: ComplexityBandId[];
  sort?: 'title' | 'year';
  sortOrder?: 'asc' | 'desc';
  skip: number;
  take: number;
};

@Injectable()
export class PrismaBoardGamesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findPaginatedForList(params: ListGamesRepositoryParams): Promise<{
    items: GameListItem[];
    total: number;
  }> {
    const and: Prisma.BoardGameWhereInput[] = [];
    if (params.titleSearch?.trim()) {
      and.push({
        title: {
          contains: params.titleSearch.trim(),
          mode: 'insensitive',
        },
      });
    }
    if (params.genreSlugs && params.genreSlugs.length > 0) {
      and.push({
        genres: {
          some: { genre: { slug: { in: params.genreSlugs } } },
        },
      });
    }
    const ptWhere = playtimeOverlapWhere(
      params.filterPlayTimeMin,
      params.filterPlayTimeMax,
    );
    if (ptWhere) {
      and.push(ptWhere);
    }
    const cxWhere = complexityBandWhere(params.complexityBands ?? []);
    if (cxWhere) {
      and.push(cxWhere);
    }

    const where: Prisma.BoardGameWhereInput =
      and.length > 0 ? { AND: and } : {};

    const orderBy = listGamesOrderBy(
      params.sort ?? 'title',
      params.sortOrder ?? 'asc',
    );

    const [rows, total] = await Promise.all([
      this.prismaService.boardGame.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        select: boardGameListSelect,
      }),
      this.prismaService.boardGame.count({ where }),
    ]);

    return { items: rows.map(boardGameListRowToItem), total };
  }

  async findWithRatingStatsBySlug(
    slug: string,
  ): Promise<GameDetailWithStats | null> {
    const game = await this.prismaService.boardGame.findUnique({
      where: { slug },
      include: {
        genres: { include: { genre: true } },
      },
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
      ...prismaBoardGameToRecord(game),
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
        playTimeMax: data.playTimeMax,
        complexity: data.complexity,
        imageUrl: data.imageUrl,
        externalId: data.externalId,
        ...(data.genreSlugs &&
          data.genreSlugs.length > 0 && {
            genres: {
              create: data.genreSlugs.map((genreSlug) => ({
                genre: { connect: { slug: genreSlug } },
              })),
            },
          }),
      },
      include: {
        genres: { include: { genre: true } },
      },
    });
    return prismaBoardGameToRecord(created);
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

    const data: Prisma.BoardGameUpdateInput = {
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
      ...(patch.playTimeMax !== undefined && {
        playTimeMax: patch.playTimeMax,
      }),
      ...(patch.complexity !== undefined && {
        complexity: patch.complexity,
      }),
      ...(patch.imageUrl !== undefined && { imageUrl: patch.imageUrl }),
      ...(patch.externalId !== undefined && {
        externalId: patch.externalId,
      }),
    };

    if (patch.genreSlugs !== undefined) {
      data.genres = {
        deleteMany: {},
        ...(patch.genreSlugs.length > 0 && {
          create: patch.genreSlugs.map((genreSlug) => ({
            genre: { connect: { slug: genreSlug } },
          })),
        }),
      };
    }

    const updated = await this.prismaService.boardGame.update({
      where: { id: existing.id },
      data,
      include: {
        genres: { include: { genre: true } },
      },
    });
    return prismaBoardGameToRecord(updated);
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
