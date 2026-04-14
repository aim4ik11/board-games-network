import { Injectable } from '@nestjs/common';
import type {
  DeleteRatingResult,
  RatingUpsertResult,
} from '../types/game.types';

@Injectable()
export abstract class GameRatingsRepositoryPort {
  abstract upsertRatingByGameSlug(params: {
    slug: string;
    userId: string;
    score: number;
  }): Promise<RatingUpsertResult | null>;

  abstract deleteRatingByGameSlug(params: {
    slug: string;
    userId: string;
  }): Promise<DeleteRatingResult>;
}
