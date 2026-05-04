import type { GameDetail, GamesListResponse } from '@boardgame/shared';
import { apiFetch } from '../lib/api';

export function fetchGamesList(params: {
  q?: string;
  page?: number;
  limit?: number;
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
  const qs = sp.toString();
  return apiFetch<GamesListResponse>(`/games${qs ? `?${qs}` : ''}`);
}

export function fetchGameBySlug(slug: string): Promise<GameDetail> {
  return apiFetch<GameDetail>(`/games/${encodeURIComponent(slug)}`);
}
