import { apiFetch } from '../lib/api';
import type { PublicUserCard } from './types';

export function fetchPublicUser(userId: string): Promise<PublicUserCard> {
  return apiFetch<PublicUserCard>(
    `/users/${encodeURIComponent(userId)}`,
    { skipAuth: true },
  );
}
