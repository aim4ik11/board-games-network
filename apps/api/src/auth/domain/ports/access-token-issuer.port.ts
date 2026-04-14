import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class AccessTokenIssuerPort {
  abstract issueAccessToken(claims: { sub: string; email: string }): string;
}
