import type { PublicUserCard } from '../../../auth/domain/types/auth-user.types';

export type FriendshipRelationship =
  | 'none'
  | 'friend'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'blocked';

export type DiscoverUserRow = PublicUserCard & {
  relationship: FriendshipRelationship;
};

export type FriendConnectionView = {
  friendshipId: string;
  user: PublicUserCard;
  friendsSince: string;
};

export type PendingRequestView = {
  friendshipId: string;
  user: PublicUserCard;
  createdAt: string;
};
