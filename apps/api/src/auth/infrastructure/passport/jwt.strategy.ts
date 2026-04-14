import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUsersRepositoryPort } from '../../domain/ports/auth-users.repository.port';
import type { JwtAccessTokenPayload } from '../../domain/types/jwt-payload.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly authUsersRepository: AuthUsersRepositoryPort,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtAccessTokenPayload) {
    const user = await this.authUsersRepository.findPublicProfileById(
      payload.sub,
    );
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
