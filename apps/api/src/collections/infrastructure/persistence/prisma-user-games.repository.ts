import { Injectable } from '@nestjs/common';
import { CollectionStatus, Prisma } from '@prisma/client';
import type { CollectionEntry } from '@boardgame/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  PatchCollectionProps,
  UpsertCollectionProps,
} from '../../domain/types/collection.types';
import { prismaCollectionStatusToWire } from './collection-status.mapper';
import {
  boardGameListSelect,
  boardGameListRowToItem,
} from '../../../games/infrastructure/persistence/board-game-list.mapper';

type RowWithGame = Prisma.UserGameGetPayload<{
  include: { game: { select: typeof boardGameListSelect } };
}>;

@Injectable()
export class PrismaUserGamesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async listForUser(params: {
    userId: string;
    status?: CollectionStatus;
  }): Promise<CollectionEntry[]> {
    const rows = await this.prismaService.userGame.findMany({
      where: {
        userId: params.userId,
        ...(params.status ? { status: params.status } : {}),
      },
      include: { game: { select: boardGameListSelect } },
      orderBy: [{ status: 'asc' }, { game: { title: 'asc' } }],
    });
    return rows.map((r) => this.toView(r));
  }

  async upsertForUser(params: {
    userId: string;
    gameId: string;
    data: UpsertCollectionProps;
  }): Promise<CollectionEntry> {
    const row = await this.prismaService.userGame.upsert({
      where: {
        userId_gameId: {
          userId: params.userId,
          gameId: params.gameId,
        },
      },
      create: {
        userId: params.userId,
        gameId: params.gameId,
        status: params.data.status,
        notes: params.data.notes ?? null,
        acquiredAt: params.data.acquiredAt ?? null,
      },
      update: {
        status: params.data.status,
        ...(params.data.notes !== undefined && { notes: params.data.notes }),
        ...(params.data.acquiredAt !== undefined && {
          acquiredAt: params.data.acquiredAt,
        }),
      },
      include: { game: { select: boardGameListSelect } },
    });
    return this.toView(row);
  }

  async updateByUserAndGameSlug(params: {
    userId: string;
    gameSlug: string;
    patch: PatchCollectionProps;
  }): Promise<CollectionEntry | null> {
    const game = await this.prismaService.boardGame.findUnique({
      where: { slug: params.gameSlug },
      select: { id: true },
    });
    if (!game) {
      return null;
    }
    try {
      const row = await this.prismaService.userGame.update({
        where: {
          userId_gameId: {
            userId: params.userId,
            gameId: game.id,
          },
        },
        data: {
          ...(params.patch.status !== undefined && {
            status: params.patch.status,
          }),
          ...(params.patch.notes !== undefined && {
            notes: params.patch.notes,
          }),
          ...(params.patch.acquiredAt !== undefined && {
            acquiredAt: params.patch.acquiredAt,
          }),
        },
        include: { game: { select: boardGameListSelect } },
      });
      return this.toView(row);
    } catch {
      return null;
    }
  }

  async removeByUserAndGameSlug(
    userId: string,
    gameSlug: string,
  ): Promise<boolean> {
    const game = await this.prismaService.boardGame.findUnique({
      where: { slug: gameSlug },
      select: { id: true },
    });
    if (!game) {
      return false;
    }
    try {
      await this.prismaService.userGame.delete({
        where: {
          userId_gameId: {
            userId,
            gameId: game.id,
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async findEntryByUserAndGameSlug(
    userId: string,
    gameSlug: string,
  ): Promise<CollectionEntry | null> {
    const game = await this.prismaService.boardGame.findUnique({
      where: { slug: gameSlug },
      select: { id: true },
    });
    if (!game) {
      return null;
    }
    const row = await this.prismaService.userGame.findUnique({
      where: {
        userId_gameId: {
          userId,
          gameId: game.id,
        },
      },
      include: { game: { select: boardGameListSelect } },
    });
    return row ? this.toView(row) : null;
  }

  private toView(row: RowWithGame): CollectionEntry {
    return {
      id: row.id,
      status: prismaCollectionStatusToWire(row.status),
      notes: row.notes,
      acquiredAt: row.acquiredAt ? row.acquiredAt.toISOString() : null,
      game: boardGameListRowToItem(row.game),
    };
  }
}
