import { Injectable } from '@nestjs/common';
import type { PublicUserCard } from '../../../auth/domain/types/auth-user.types';

export type StoredFriendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  createdAt: Date;
};

@Injectable()
export abstract class FriendshipsRepositoryPort {
  abstract findPair(
    userIdA: string,
    userIdB: string,
  ): Promise<StoredFriendship | null>;

  abstract findManyBetweenUserAndCandidates(
    userId: string,
    candidateIds: string[],
  ): Promise<StoredFriendship[]>;

  abstract createPendingRequest(
    requesterId: string,
    addresseeId: string,
  ): Promise<StoredFriendship>;

  abstract acceptPendingRequest(
    requesterId: string,
    addresseeId: string,
  ): Promise<StoredFriendship | null>;

  abstract deleteByPair(
    requesterId: string,
    addresseeId: string,
  ): Promise<boolean>;

  abstract listAcceptedFriends(userId: string): Promise<
    {
      friendshipId: string;
      otherUser: PublicUserCard;
      friendsSince: Date;
    }[]
  >;

  abstract listIncomingPending(userId: string): Promise<
    {
      friendshipId: string;
      requester: PublicUserCard;
      createdAt: Date;
    }[]
  >;

  abstract listOutgoingPending(userId: string): Promise<
    {
      friendshipId: string;
      addressee: PublicUserCard;
      createdAt: Date;
    }[]
  >;

  abstract deleteAcceptedFriendshipBetween(
    userId: string,
    otherUserId: string,
  ): Promise<boolean>;
}
