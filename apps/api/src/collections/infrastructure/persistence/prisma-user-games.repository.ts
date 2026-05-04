import { Injectable } from '@nestjs/common';
import { CollectionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { BoardGameListItem } from '../../../games/domain/types/game.types';
import type {
  CollectionEntryView,
  PatchCollectionProps,
  UpsertCollectionProps,
} from '../../domain/types/collection.types';

const gameListSelect = {
  id: true,
  slug: true,
  title: true,
  yearPublished: true,
  minPlayers: true,
  maxPlayers: true,
  playTimeMin: true,
  imageUrl: true,
} as const;

type RowWithGame = Prisma.UserGameGetPayload<{
  include: { game: { select: typeof gameListSelect } };
}>;

@Injectable()
export class PrismaUserGamesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async listForUser(params: {
    userId: string;
    status?: string;
  }): Promise<CollectionEntryView[]> {
    const statusFilter = params.status
      ? (params.status as CollectionStatus)
      : undefined;
    const rows = await this.prismaService.userGame.findMany({
      where: {
        userId: params.userId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: { game: { select: gameListSelect } },
      orderBy: [{ status: 'asc' }, { game: { title: 'asc' } }],
    });
    return rows.map((r) => this.toView(r));
  }

  async upsertForUser(params: {
    userId: string;
    gameId: string;
    data: UpsertCollectionProps;
  }): Promise<CollectionEntryView> {
    const status = params.data.status as CollectionStatus;
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
        status,
        notes: params.data.notes ?? null,
        acquiredAt: params.data.acquiredAt ?? null,
      },
      update: {
        status,
        ...(params.data.notes !== undefined && { notes: params.data.notes }),
        ...(params.data.acquiredAt !== undefined && {
          acquiredAt: params.data.acquiredAt,
        }),
      },
      include: { game: { select: gameListSelect } },
    });
    return this.toView(row);
  }

  async updateByUserAndGameSlug(params: {
    userId: string;
    gameSlug: string;
    patch: PatchCollectionProps;
  }): Promise<CollectionEntryView | null> {
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
            status: params.patch.status as CollectionStatus,
          }),
          ...(params.patch.notes !== undefined && {
            notes: params.patch.notes,
          }),
          ...(params.patch.acquiredAt !== undefined && {
            acquiredAt: params.patch.acquiredAt,
          }),
        },
        include: { game: { select: gameListSelect } },
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
  ): Promise<CollectionEntryView | null> {
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
      include: { game: { select: gameListSelect } },
    });
    return row ? this.toView(row) : null;
  }

  private toView(row: RowWithGame): CollectionEntryView {
    return {
      id: row.id,
      status: row.status,
      notes: row.notes,
      acquiredAt: row.acquiredAt ? row.acquiredAt.toISOString() : null,
      game: row.game as BoardGameListItem,
    };
  }
}
