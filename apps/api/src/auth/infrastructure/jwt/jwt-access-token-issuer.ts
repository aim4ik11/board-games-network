import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtAccessTokenPayload } from '../../domain/types/jwt-payload.types';

@Injectable()
export class JwtAccessTokenIssuer {
  constructor(private readonly jwtService: JwtService) {}

  issueAccessToken(claims: { sub: string; email: string }): string {
    const payload: JwtAccessTokenPayload = {
      sub: claims.sub,
      email: claims.email,
    };
    return this.jwtService.sign(payload);
  }
}
