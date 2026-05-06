import type {
  CollectionEntry,
  CollectionStatus,
  OkResponse,
} from '@boardgame/shared';
import { apiFetch, ApiError } from '../lib/api';

export async function fetchMyCollection(
  status?: CollectionStatus,
): Promise<CollectionEntry[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<CollectionEntry[]>(`/me/collection${qs}`);
}

export async function fetchCollectionEntry(
  slug: string,
): Promise<CollectionEntry | null> {
  try {
    return await apiFetch<CollectionEntry>(
      `/me/collection/${encodeURIComponent(slug)}`,
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return null;
    }
    throw e;
  }
}

export function addToCollection(body: {
  slug: string;
  status?: CollectionStatus;
}): Promise<CollectionEntry> {
  return apiFetch<CollectionEntry>('/me/collection', {
    method: 'POST',
    body: JSON.stringify({
      slug: body.slug,
      ...(body.status !== undefined && { status: body.status }),
    }),
  });
}

export function patchCollectionItem(
  slug: string,
  body: { status?: CollectionStatus; notes?: string },
): Promise<CollectionEntry> {
  return apiFetch<CollectionEntry>(
    `/me/collection/${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}

export function removeFromCollection(slug: string): Promise<OkResponse> {
  return apiFetch<OkResponse>(
    `/me/collection/${encodeURIComponent(slug)}`,
    { method: 'DELETE' },
  );
}
