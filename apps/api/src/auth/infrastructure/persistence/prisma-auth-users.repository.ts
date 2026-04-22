import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuthUsersRepositoryPort,
  type UserCredentialsRecord,
} from '../../domain/ports/auth-users.repository.port';
import type {
  AuthUser,
  PublicProfileSummary,
  PublicUserCard,
} from '../../domain/types/auth-user.types';
import { CollectionStatus, FriendshipStatus } from '@prisma/client';

const publicSelect = {
  id: true,
  email: true,
  displayName: true,
  bio: true,
  city: true,
  avatarUrl: true,
} as const;

const cardSelect = {
  id: true,
  displayName: true,
  bio: true,
  city: true,
  avatarUrl: true,
} as const;

@Injectable()
export class PrismaAuthUsersRepository extends AuthUsersRepositoryPort {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async findWithCredentialsByEmail(
    email: string,
  ): Promise<UserCredentialsRecord | null> {
    const row = await this.prismaService.user.findUnique({
      where: { email },
      select: { ...publicSelect, passwordHash: true },
    });
    return row as UserCredentialsRecord | null;
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.prismaService.user
      .findUnique({ where: { email }, select: { id: true } })
      .then((r) => r !== null);
  }

  async createRegisteredUser(data: {
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<AuthUser> {
    const user = await this.prismaService.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
      },
      select: publicSelect,
    });
    return user as AuthUser;
  }

  async findPublicProfileById(id: string): Promise<AuthUser | null> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: publicSelect,
    });
    return user as AuthUser | null;
  }

  async findUserCardById(id: string): Promise<PublicUserCard | null> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: cardSelect,
    });
    return user as PublicUserCard | null;
  }

  async findPublicProfileSummaryById(
    id: string,
  ): Promise<PublicProfileSummary | null> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: cardSelect,
    });
    if (!user) {
      return null;
    }

    const gameSelect = {
      id: true,
      slug: true,
      title: true,
      imageUrl: true,
    } as const;

    const [byStatus, friendsCount, ratingsCount, reviewsCount, owned, wishlist, previous] =
      await Promise.all([
        this.prismaService.userGame.groupBy({
          by: ['status'],
          where: { userId: id },
          _count: { _all: true },
        }),
        this.prismaService.friendship.count({
          where: {
            status: FriendshipStatus.ACCEPTED,
            OR: [{ requesterId: id }, { addresseeId: id }],
          },
        }),
        this.prismaService.rating.count({ where: { userId: id } }),
        this.prismaService.review.count({ where: { userId: id } }),
        this.prismaService.userGame.findMany({
          where: { userId: id, status: CollectionStatus.OWNED },
          orderBy: { id: 'desc' },
          take: 6,
          select: { game: { select: gameSelect } },
        }),
        this.prismaService.userGame.findMany({
          where: { userId: id, status: CollectionStatus.WISHLIST },
          orderBy: { id: 'desc' },
          take: 6,
          select: { game: { select: gameSelect } },
        }),
        this.prismaService.userGame.findMany({
          where: { userId: id, status: CollectionStatus.PREVIOUSLY_OWNED },
          orderBy: { id: 'desc' },
          take: 6,
          select: { game: { select: gameSelect } },
        }),
      ]);

    const statusCount = new Map<CollectionStatus, number>();
    for (const row of byStatus) {
      statusCount.set(row.status, row._count._all);
    }

    const ownedCount = statusCount.get(CollectionStatus.OWNED) ?? 0;
    const wishlistCount = statusCount.get(CollectionStatus.WISHLIST) ?? 0;
    const previouslyOwnedCount =
      statusCount.get(CollectionStatus.PREVIOUSLY_OWNED) ?? 0;
    const collectionTotal = ownedCount + wishlistCount + previouslyOwnedCount;

    return {
      user: user as PublicUserCard,
      stats: {
        collectionTotal,
        ownedCount,
        wishlistCount,
        previouslyOwnedCount,
        friendsCount,
        ratingsCount,
        reviewsCount,
      },
      collectionPreview: {
        owned: owned.map((row) => row.game),
        wishlist: wishlist.map((row) => row.game),
        previouslyOwned: previous.map((row) => row.game),
      },
    };
  }

  async updateProfile(
    userId: string,
    patch: {
      displayName?: string;
      bio?: string | null;
      city?: string | null;
      avatarUrl?: string | null;
    },
  ): Promise<AuthUser> {
    const updated = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        ...(patch.displayName !== undefined && {
          displayName: patch.displayName,
        }),
        ...(patch.bio !== undefined && { bio: patch.bio }),
        ...(patch.city !== undefined && { city: patch.city }),
        ...(patch.avatarUrl !== undefined && { avatarUrl: patch.avatarUrl }),
      },
      select: publicSelect,
    });
    return updated as AuthUser;
  }

  async searchPublicUserCards(params: {
    q: string;
    city?: string;
    excludeUserId: string;
    skip: number;
    take: number;
  }): Promise<{ items: PublicUserCard[]; total: number }> {
    const term = params.q.trim();
    const cityTerm = params.city?.trim();
    if (!term && !cityTerm) {
      return { items: [], total: 0 };
    }
    const where = {
      id: { not: params.excludeUserId },
      ...(term
        ? { displayName: { contains: term, mode: 'insensitive' as const } }
        : {}),
      ...(cityTerm
        ? { city: { equals: cityTerm, mode: 'insensitive' as const } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        select: cardSelect,
        orderBy: { displayName: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prismaService.user.count({ where }),
    ]);
    return { items: rows as PublicUserCard[], total };
  }
}
