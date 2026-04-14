import { Injectable } from '@nestjs/common';
import type { ReviewWithAuthorView } from '../types/game.types';

@Injectable()
export abstract class GameReviewsRepositoryPort {
  abstract findPaginatedByGameSlug(params: {
    slug: string;
    skip: number;
    take: number;
  }): Promise<{ items: ReviewWithAuthorView[]; total: number } | null>;

  abstract createReviewByGameSlug(params: {
    slug: string;
    userId: string;
    body: string;
  }): Promise<ReviewWithAuthorView | null>;

  abstract updateReviewByGameSlug(params: {
    slug: string;
    userId: string;
    body: string;
  }): Promise<ReviewWithAuthorView | null>;

  abstract deleteReviewByGameSlug(params: {
    slug: string;
    userId: string;
  }): Promise<boolean>;
}
