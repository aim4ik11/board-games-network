import { CollectionStatus as PrismaCollectionStatus } from '@prisma/client';
import type { CollectionStatus } from '@boardgame/shared';

/** Maps Prisma enum to shared wire union (distinct nominal types). */
export function prismaCollectionStatusToWire(
  status: PrismaCollectionStatus,
): CollectionStatus {
  switch (status) {
    case PrismaCollectionStatus.OWNED:
      return 'OWNED';
    case PrismaCollectionStatus.WISHLIST:
      return 'WISHLIST';
    case PrismaCollectionStatus.PREVIOUSLY_OWNED:
      return 'PREVIOUSLY_OWNED';
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unexpected collection status: ${String(_exhaustive)}`);
    }
  }
}

export function wireCollectionStatusToPrisma(
  status: CollectionStatus,
): PrismaCollectionStatus {
  switch (status) {
    case 'OWNED':
      return PrismaCollectionStatus.OWNED;
    case 'WISHLIST':
      return PrismaCollectionStatus.WISHLIST;
    case 'PREVIOUSLY_OWNED':
      return PrismaCollectionStatus.PREVIOUSLY_OWNED;
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unexpected collection status: ${String(_exhaustive)}`);
    }
  }
}
