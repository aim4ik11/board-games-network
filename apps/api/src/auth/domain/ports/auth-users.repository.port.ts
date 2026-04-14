import { Injectable } from '@nestjs/common';
import type { AuthUser, PublicUserCard } from '../types/auth-user.types';

export type UserCredentialsRecord = AuthUser & {
  passwordHash: string;
};

@Injectable()
export abstract class AuthUsersRepositoryPort {
  abstract findWithCredentialsByEmail(
    email: string,
  ): Promise<UserCredentialsRecord | null>;

  abstract existsByEmail(email: string): Promise<boolean>;

  abstract createRegisteredUser(data: {
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<AuthUser>;

  abstract findPublicProfileById(id: string): Promise<AuthUser | null>;

  abstract findUserCardById(id: string): Promise<PublicUserCard | null>;

  abstract updateProfile(
    userId: string,
    patch: {
      displayName?: string;
      bio?: string | null;
      city?: string | null;
      avatarUrl?: string | null;
    },
  ): Promise<AuthUser>;

  abstract searchPublicUserCards(params: {
    q: string;
    excludeUserId: string;
    skip: number;
    take: number;
  }): Promise<{ items: PublicUserCard[]; total: number }>;
}
