import { Injectable } from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import type { PublicUserCard } from '../../../auth/domain/types/auth-user.types';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  FriendshipsRepositoryPort,
  type StoredFriendship,
} from '../../domain/ports/friendships.repository.port';

const cardSelect = {
  id: true,
  displayName: true,
  bio: true,
  city: true,
  avatarUrl: true,
} as const;

@Injectable()
export class PrismaFriendshipsRepository extends FriendshipsRepositoryPort {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async findPair(
    userIdA: string,
    userIdB: string,
  ): Promise<StoredFriendship | null> {
    const row = await this.prismaService.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userIdA, addresseeId: userIdB },
          { requesterId: userIdB, addresseeId: userIdA },
        ],
      },
    });
    return row ? this.toStored(row) : null;
  }

  async findManyBetweenUserAndCandidates(
    userId: string,
    candidateIds: string[],
  ): Promise<StoredFriendship[]> {
    if (candidateIds.length === 0) {
      return [];
    }
    const rows = await this.prismaService.friendship.findMany({
      where: {
        OR: [
          {
            requesterId: userId,
            addresseeId: { in: candidateIds },
          },
          {
            addresseeId: userId,
            requesterId: { in: candidateIds },
          },
        ],
      },
    });
    return rows.map((r) => this.toStored(r));
  }

  async createPendingRequest(
    requesterId: string,
    addresseeId: string,
  ): Promise<StoredFriendship> {
    const row = await this.prismaService.friendship.create({
      data: {
        requesterId,
        addresseeId,
        status: FriendshipStatus.PENDING,
      },
    });
    return this.toStored(row);
  }

  async acceptPendingRequest(
    requesterId: string,
    addresseeId: string,
  ): Promise<StoredFriendship | null> {
    try {
      const row = await this.prismaService.friendship.update({
        where: {
          requesterId_addresseeId: { requesterId, addresseeId },
        },
        data: { status: FriendshipStatus.ACCEPTED },
      });
      return this.toStored(row);
    } catch {
      return null;
    }
  }

  async deleteByPair(
    requesterId: string,
    addresseeId: string,
  ): Promise<boolean> {
    try {
      await this.prismaService.friendship.delete({
        where: {
          requesterId_addresseeId: { requesterId, addresseeId },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async listAcceptedFriends(userId: string): Promise<
    {
      friendshipId: string;
      otherUser: PublicUserCard;
      friendsSince: Date;
    }[]
  > {
    const rows = await this.prismaService.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: cardSelect },
        addressee: { select: cardSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => {
      const other = r.requesterId === userId ? r.addressee : r.requester;
      return {
        friendshipId: r.id,
        otherUser: other as PublicUserCard,
        friendsSince: r.createdAt,
      };
    });
  }

  async listIncomingPending(userId: string): Promise<
    {
      friendshipId: string;
      requester: PublicUserCard;
      createdAt: Date;
    }[]
  > {
    const rows = await this.prismaService.friendship.findMany({
      where: {
        addresseeId: userId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        requester: { select: cardSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      friendshipId: r.id,
      requester: r.requester as PublicUserCard,
      createdAt: r.createdAt,
    }));
  }

  async listOutgoingPending(userId: string): Promise<
    {
      friendshipId: string;
      addressee: PublicUserCard;
      createdAt: Date;
    }[]
  > {
    const rows = await this.prismaService.friendship.findMany({
      where: {
        requesterId: userId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        addressee: { select: cardSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      friendshipId: r.id,
      addressee: r.addressee as PublicUserCard,
      createdAt: r.createdAt,
    }));
  }

  async deleteAcceptedFriendshipBetween(
    userId: string,
    otherUserId: string,
  ): Promise<boolean> {
    const row = await this.prismaService.friendship.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { requesterId: userId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: userId },
        ],
      },
      select: { id: true },
    });
    if (!row) {
      return false;
    }
    await this.prismaService.friendship.delete({ where: { id: row.id } });
    return true;
  }

  private toStored(row: {
    id: string;
    requesterId: string;
    addresseeId: string;
    status: FriendshipStatus;
    createdAt: Date;
  }): StoredFriendship {
    return {
      id: row.id,
      requesterId: row.requesterId,
      addresseeId: row.addresseeId,
      status: row.status,
      createdAt: row.createdAt,
    };
  }
}
