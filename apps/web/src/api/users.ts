import type { PublicProfileSummary, PublicUserCard } from '@boardgame/shared';
import { apiFetch } from '../lib/api';

export function fetchPublicUser(userId: string): Promise<PublicUserCard> {
  return apiFetch<PublicUserCard>(`/users/${encodeURIComponent(userId)}`, {
    skipAuth: true,
  });
}

export function fetchPublicProfileSummary(
  userId: string,
): Promise<PublicProfileSummary> {
  return apiFetch<PublicProfileSummary>(
    `/users/${encodeURIComponent(userId)}/summary`,
    { skipAuth: true },
  );
}
