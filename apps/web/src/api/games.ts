import type {
  CreateGameReviewPayload,
  GameDetail,
  GameReview,
  GameReviewsListResponse,
  GamesListResponse,
  OkResponse,
  UpsertGameRatingPayload,
  UpdateGameReviewPayload,
} from '@boardgame/shared';
import { apiFetch } from '../lib/api';

export function fetchGamesList(params: {
  q?: string;
  page?: number;
  limit?: number;
  genres?: string;
  ptMin?: number;
  ptMax?: number;
  complexity?: string;
  sort?: 'title' | 'year';
  order?: 'asc' | 'desc';
}): Promise<GamesListResponse> {
  const sp = new URLSearchParams();
  if (params.q) {
    sp.set('q', params.q);
  }
  if (params.page != null) {
    sp.set('page', String(params.page));
  }
  if (params.limit != null) {
    sp.set('limit', String(params.limit));
  }
  if (params.genres?.trim()) {
    sp.set('genres', params.genres.trim());
  }
  if (params.ptMin != null) {
    sp.set('ptMin', String(params.ptMin));
  }
  if (params.ptMax != null) {
    sp.set('ptMax', String(params.ptMax));
  }
  if (params.complexity?.trim()) {
    sp.set('complexity', params.complexity.trim());
  }
  if (params.sort) {
    sp.set('sort', params.sort);
  }
  if (params.order) {
    sp.set('order', params.order);
  }
  const qs = sp.toString();
  return apiFetch<GamesListResponse>(`/games${qs ? `?${qs}` : ''}`);
}

export function fetchGameBySlug(slug: string): Promise<GameDetail> {
  return apiFetch<GameDetail>(`/games/${encodeURIComponent(slug)}`);
}

export function fetchGameReviews(params: {
  slug: string;
  page?: number;
  limit?: number;
}): Promise<GameReviewsListResponse> {
  const sp = new URLSearchParams();
  if (params.page != null) {
    sp.set('page', String(params.page));
  }
  if (params.limit != null) {
    sp.set('limit', String(params.limit));
  }
  const qs = sp.toString();
  return apiFetch<GameReviewsListResponse>(
    `/games/${encodeURIComponent(params.slug)}/reviews${qs ? `?${qs}` : ''}`,
  );
}

export function createGameReview(
  slug: string,
  payload: CreateGameReviewPayload,
): Promise<GameReview> {
  return apiFetch<GameReview>(`/games/${encodeURIComponent(slug)}/reviews`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateGameReview(
  slug: string,
  payload: UpdateGameReviewPayload,
): Promise<GameReview> {
  return apiFetch<GameReview>(`/games/${encodeURIComponent(slug)}/reviews`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteGameReview(slug: string): Promise<OkResponse> {
  return apiFetch<OkResponse>(`/games/${encodeURIComponent(slug)}/reviews`, {
    method: 'DELETE',
  });
}

export function upsertGameRating(
  slug: string,
  payload: UpsertGameRatingPayload,
): Promise<{ id: string; score: number; userId: string; gameId: string }> {
  return apiFetch(`/games/${encodeURIComponent(slug)}/ratings`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
