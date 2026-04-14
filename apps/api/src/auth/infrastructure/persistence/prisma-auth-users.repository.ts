import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuthUsersRepositoryPort,
  type UserCredentialsRecord,
} from '../../domain/ports/auth-users.repository.port';
import type {
  AuthUser,
  PublicUserCard,
} from '../../domain/types/auth-user.types';

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
    excludeUserId: string;
    skip: number;
    take: number;
  }): Promise<{ items: PublicUserCard[]; total: number }> {
    const term = params.q.trim();
    if (!term) {
      return { items: [], total: 0 };
    }
    const where = {
      id: { not: params.excludeUserId },
      displayName: { contains: term, mode: 'insensitive' as const },
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
