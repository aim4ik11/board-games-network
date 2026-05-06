import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class Sha256HasherService {
  hash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
