import { Injectable } from '@nestjs/common';
import type {
  CollectionEntryView,
  PatchCollectionProps,
  UpsertCollectionProps,
} from '../types/collection.types';

@Injectable()
export abstract class UserGamesRepositoryPort {
  abstract listForUser(params: {
    userId: string;
    status?: string;
  }): Promise<CollectionEntryView[]>;

  abstract upsertForUser(params: {
    userId: string;
    gameId: string;
    data: UpsertCollectionProps;
  }): Promise<CollectionEntryView>;

  abstract updateByUserAndGameSlug(params: {
    userId: string;
    gameSlug: string;
    patch: PatchCollectionProps;
  }): Promise<CollectionEntryView | null>;

  abstract removeByUserAndGameSlug(
    userId: string,
    gameSlug: string,
  ): Promise<boolean>;

  abstract findEntryByUserAndGameSlug(
    userId: string,
    gameSlug: string,
  ): Promise<CollectionEntryView | null>;
}
