import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenIssuerPort } from '../../domain/ports/access-token-issuer.port';
import type { JwtAccessTokenPayload } from '../../domain/types/jwt-payload.types';

@Injectable()
export class JwtAccessTokenIssuer extends AccessTokenIssuerPort {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  issueAccessToken(claims: { sub: string; email: string }): string {
    const payload: JwtAccessTokenPayload = {
      sub: claims.sub,
      email: claims.email,
    };
    return this.jwtService.sign(payload);
  }
}
