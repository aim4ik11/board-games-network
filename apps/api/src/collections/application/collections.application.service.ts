import { Injectable, NotFoundException } from '@nestjs/common';
import { CollectionStatus } from '@prisma/client';
import { BoardGamesRepositoryPort } from '../../games/domain/ports/board-games.repository.port';
import { UserGamesRepositoryPort } from '../domain/ports/user-games.repository.port';
import type { CollectionEntryView } from '../domain/types/collection.types';

@Injectable()
export class CollectionsApplicationService {
  constructor(
    private readonly boardGamesRepository: BoardGamesRepositoryPort,
    private readonly userGamesRepository: UserGamesRepositoryPort,
  ) {}

  listMyCollection(
    userId: string,
    status?: CollectionStatus,
  ): Promise<CollectionEntryView[]> {
    return this.userGamesRepository.listForUser({
      userId,
      ...(status ? { status } : {}),
    });
  }

  async addToCollection(
    userId: string,
    slug: string,
    status: CollectionStatus = CollectionStatus.OWNED,
  ): Promise<CollectionEntryView> {
    const gameId = await this.boardGamesRepository.findIdBySlug(slug);
    if (!gameId) {
      throw new NotFoundException('Game not found');
    }
    return this.userGamesRepository.upsertForUser({
      userId,
      gameId,
      data: { status },
    });
  }

  async updateCollectionItem(
    userId: string,
    slug: string,
    patch: {
      status?: CollectionStatus;
      notes?: string | null;
      acquiredAt?: Date | null;
    },
  ): Promise<CollectionEntryView> {
    const updated = await this.userGamesRepository.updateByUserAndGameSlug({
      userId,
      gameSlug: slug,
      patch: {
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.notes !== undefined && { notes: patch.notes }),
        ...(patch.acquiredAt !== undefined && { acquiredAt: patch.acquiredAt }),
      },
    });
    if (!updated) {
      throw new NotFoundException('Collection entry not found');
    }
    return updated;
  }

  async removeFromCollection(userId: string, slug: string): Promise<void> {
    const ok = await this.userGamesRepository.removeByUserAndGameSlug(
      userId,
      slug,
    );
    if (!ok) {
      throw new NotFoundException('Collection entry not found');
    }
  }

  myEntryForGame(
    userId: string,
    slug: string,
  ): Promise<CollectionEntryView | null> {
    return this.userGamesRepository.findEntryByUserAndGameSlug(userId, slug);
  }
}
