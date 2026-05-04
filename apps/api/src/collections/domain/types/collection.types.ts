import type { CollectionStatus as PrismaCollectionStatus } from '@prisma/client';

export type UpsertCollectionProps = {
  status: PrismaCollectionStatus;
  notes?: string | null;
  acquiredAt?: Date | null;
};

export type PatchCollectionProps = {
  status?: PrismaCollectionStatus;
  notes?: string | null;
  acquiredAt?: Date | null;
};
