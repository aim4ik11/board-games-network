import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import { AuthUsersRepositoryPort } from '../../auth/domain/ports/auth-users.repository.port';
import { FriendshipsRepositoryPort } from '../domain/ports/friendships.repository.port';
import type {
  DiscoverUserRow,
  FriendConnectionView,
  FriendshipRelationship,
  PendingRequestView,
} from '../domain/types/friends.types';

@Injectable()
export class FriendsApplicationService {
  constructor(
    private readonly authUsersRepository: AuthUsersRepositoryPort,
    private readonly friendshipsRepository: FriendshipsRepositoryPort,
  ) {}

  private relationshipFromRow(
    meId: string,
    row: { requesterId: string; addresseeId: string; status: string },
  ): FriendshipRelationship {
    if (row.status === FriendshipStatus.BLOCKED) {
      return 'blocked';
    }
    if (row.status === FriendshipStatus.ACCEPTED) {
      return 'friend';
    }
    if (row.status === FriendshipStatus.PENDING) {
      return row.requesterId === meId ? 'outgoing_pending' : 'incoming_pending';
    }
    return 'none';
  }

  async discover(
    meId: string,
    q: string,
    page: number,
    limit: number,
  ): Promise<{
    data: DiscoverUserRow[];
    meta: { total: number; page: number; limit: number };
  }> {
    const skip = (page - 1) * limit;
    const { items, total } =
      await this.authUsersRepository.searchPublicUserCards({
        q,
        excludeUserId: meId,
        skip,
        take: limit,
      });
    if (items.length === 0) {
      return { data: [], meta: { total, page, limit } };
    }
    const ids = items.map((u) => u.id);
    const rows =
      await this.friendshipsRepository.findManyBetweenUserAndCandidates(
        meId,
        ids,
      );
    const byOther = new Map<string, (typeof rows)[0]>();
    for (const r of rows) {
      const otherId = r.requesterId === meId ? r.addresseeId : r.requesterId;
      byOther.set(otherId, r);
    }
    const data: DiscoverUserRow[] = items.map((user) => {
      const row = byOther.get(user.id);
      return {
        ...user,
        relationship: row ? this.relationshipFromRow(meId, row) : 'none',
      };
    });
    return { data, meta: { total, page, limit } };
  }

  async listFriends(meId: string): Promise<FriendConnectionView[]> {
    const rows = await this.friendshipsRepository.listAcceptedFriends(meId);
    return rows.map((r) => ({
      friendshipId: r.friendshipId,
      user: r.otherUser,
      friendsSince: r.friendsSince.toISOString(),
    }));
  }

  async listIncomingRequests(meId: string): Promise<PendingRequestView[]> {
    const rows = await this.friendshipsRepository.listIncomingPending(meId);
    return rows.map((r) => ({
      friendshipId: r.friendshipId,
      user: r.requester,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async listOutgoingRequests(meId: string): Promise<PendingRequestView[]> {
    const rows = await this.friendshipsRepository.listOutgoingPending(meId);
    return rows.map((r) => ({
      friendshipId: r.friendshipId,
      user: r.addressee,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async sendFriendRequest(meId: string, toUserId: string): Promise<void> {
    if (meId === toUserId) {
      throw new BadRequestException('Cannot friend yourself');
    }
    const target = await this.authUsersRepository.findUserCardById(toUserId);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    const existing = await this.friendshipsRepository.findPair(meId, toUserId);
    if (!existing) {
      await this.friendshipsRepository.createPendingRequest(meId, toUserId);
      return;
    }
    if (existing.status === FriendshipStatus.BLOCKED) {
      throw new ConflictException('Cannot send a friend request');
    }
    if (existing.status === FriendshipStatus.ACCEPTED) {
      throw new ConflictException('Already friends');
    }
    if (existing.status === FriendshipStatus.PENDING) {
      if (existing.requesterId === meId) {
        throw new ConflictException('Request already sent');
      }
      const ok = await this.friendshipsRepository.acceptPendingRequest(
        toUserId,
        meId,
      );
      if (!ok) {
        throw new ConflictException('Could not accept request');
      }
    }
  }

  async acceptRequest(meId: string, fromUserId: string): Promise<void> {
    const row = await this.friendshipsRepository.findPair(meId, fromUserId);
    if (
      !row ||
      row.status !== FriendshipStatus.PENDING ||
      row.requesterId !== fromUserId ||
      row.addresseeId !== meId
    ) {
      throw new NotFoundException('No pending request from this user');
    }
    const ok = await this.friendshipsRepository.acceptPendingRequest(
      fromUserId,
      meId,
    );
    if (!ok) {
      throw new ConflictException('Could not accept request');
    }
  }

  async declineIncoming(meId: string, fromUserId: string): Promise<void> {
    const ok = await this.friendshipsRepository.deleteByPair(fromUserId, meId);
    if (!ok) {
      throw new NotFoundException('No pending request from this user');
    }
  }

  async cancelOutgoing(meId: string, toUserId: string): Promise<void> {
    const ok = await this.friendshipsRepository.deleteByPair(meId, toUserId);
    if (!ok) {
      throw new NotFoundException('No outgoing request to this user');
    }
  }

  async unfriend(meId: string, otherUserId: string): Promise<void> {
    if (meId === otherUserId) {
      throw new BadRequestException('Invalid user');
    }
    const ok = await this.friendshipsRepository.deleteAcceptedFriendshipBetween(
      meId,
      otherUserId,
    );
    if (!ok) {
      throw new NotFoundException('Not friends with this user');
    }
  }

  async areAcceptedFriends(userIdA: string, userIdB: string): Promise<boolean> {
    if (userIdA === userIdB) {
      return false;
    }
    const row = await this.friendshipsRepository.findPair(userIdA, userIdB);
    return row?.status === FriendshipStatus.ACCEPTED;
  }
}
