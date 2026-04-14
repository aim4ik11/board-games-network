import type { BoardGameListItem } from '../../../games/domain/types/game.types';

export type CollectionEntryView = {
  id: string;
  status: string;
  notes: string | null;
  acquiredAt: string | null;
  game: BoardGameListItem;
};

export type UpsertCollectionProps = {
  status: string;
  notes?: string | null;
  acquiredAt?: Date | null;
};

export type PatchCollectionProps = {
  status?: string;
  notes?: string | null;
  acquiredAt?: Date | null;
};
