import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Sha256HasherService } from '../crypto/sha256-hasher.service';

@Injectable()
export class RefreshTokenService {
  constructor(private readonly sha256HasherService: Sha256HasherService) {}

  generateOpaqueToken(): string {
    return randomBytes(48).toString('base64url');
  }

  generateTokenFamily(): string {
    return randomBytes(24).toString('hex');
  }

  hashToken(token: string): string {
    return this.sha256HasherService.hash(token);
  }
}
