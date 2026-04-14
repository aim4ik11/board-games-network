import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthUser, PublicUserCard } from '../domain/types/auth-user.types';
import { AccessTokenIssuerPort } from '../domain/ports/access-token-issuer.port';
import { AuthUsersRepositoryPort } from '../domain/ports/auth-users.repository.port';
import { PasswordHasherPort } from '../domain/ports/password-hasher.port';

export type RegisterUserProps = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginUserProps = {
  email: string;
  password: string;
};

@Injectable()
export class AuthApplicationService {
  constructor(
    private readonly authUsersRepository: AuthUsersRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly accessTokenIssuer: AccessTokenIssuerPort,
  ) {}

  async register(props: RegisterUserProps) {
    const email = props.email.toLowerCase();
    const exists = await this.authUsersRepository.existsByEmail(email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await this.passwordHasher.hash(props.password);
    const user = await this.authUsersRepository.createRegisteredUser({
      email,
      passwordHash,
      displayName: props.displayName.trim(),
    });
    return {
      accessToken: this.accessTokenIssuer.issueAccessToken({
        sub: user.id,
        email: user.email,
      }),
      user,
    };
  }

  async login(props: LoginUserProps) {
    const email = props.email.toLowerCase();
    const row =
      await this.authUsersRepository.findWithCredentialsByEmail(email);
    if (!row) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await this.passwordHasher.verify(
      props.password,
      row.passwordHash,
    );
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const { passwordHash: _pw, ...user } = row;
    return {
      accessToken: this.accessTokenIssuer.issueAccessToken({
        sub: user.id,
        email: user.email,
      }),
      user,
    };
  }

  me(user: AuthUser) {
    return user;
  }

  async getPublicProfile(userId: string): Promise<PublicUserCard> {
    const card = await this.authUsersRepository.findUserCardById(userId);
    if (!card) {
      throw new NotFoundException('User not found');
    }
    return card;
  }

  async updateMyProfile(
    user: AuthUser,
    patch: {
      displayName?: string;
      bio?: string;
      city?: string;
      avatarUrl?: string;
    },
  ): Promise<AuthUser> {
    const data = {
      ...(patch.displayName !== undefined && {
        displayName: patch.displayName.trim(),
      }),
      ...(patch.bio !== undefined && {
        bio: patch.bio.trim() === '' ? null : patch.bio.trim(),
      }),
      ...(patch.city !== undefined && {
        city: patch.city.trim() === '' ? null : patch.city.trim(),
      }),
      ...(patch.avatarUrl !== undefined && {
        avatarUrl:
          patch.avatarUrl.trim() === '' ? null : patch.avatarUrl.trim(),
      }),
    };
    if (Object.keys(data).length === 0) {
      return user;
    }
    return this.authUsersRepository.updateProfile(user.id, data);
  }
}
