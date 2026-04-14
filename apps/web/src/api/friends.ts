import { apiFetch } from '../lib/api';
import type {
  DiscoverUserRow,
  FriendConnection,
  PaginatedMeta,
  PendingRequest,
} from './types';

export function fetchFriendsDiscover(params: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: DiscoverUserRow[]; meta: PaginatedMeta }> {
  const sp = new URLSearchParams();
  if (params.q?.trim()) {
    sp.set('q', params.q.trim());
  }
  if (params.page != null) {
    sp.set('page', String(params.page));
  }
  if (params.limit != null) {
    sp.set('limit', String(params.limit));
  }
  const qs = sp.toString();
  return apiFetch<{ data: DiscoverUserRow[]; meta: PaginatedMeta }>(
    `/friends/discover${qs ? `?${qs}` : ''}`,
  );
}

export function fetchFriendsList(): Promise<FriendConnection[]> {
  return apiFetch<FriendConnection[]>('/friends');
}

export function fetchIncomingRequests(): Promise<PendingRequest[]> {
  return apiFetch<PendingRequest[]>('/friends/requests/incoming');
}

export function fetchOutgoingRequests(): Promise<PendingRequest[]> {
  return apiFetch<PendingRequest[]>('/friends/requests/outgoing');
}

export function sendFriendRequest(toUserId: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ toUserId }),
  });
}

export function acceptFriendRequest(fromUserId: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/friends/requests/${encodeURIComponent(fromUserId)}/accept`,
    { method: 'POST' },
  );
}

export function declineFriendRequest(fromUserId: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/friends/requests/${encodeURIComponent(fromUserId)}`,
    { method: 'DELETE' },
  );
}

export function cancelOutgoingRequest(toUserId: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/friends/outgoing/${encodeURIComponent(toUserId)}`,
    { method: 'DELETE' },
  );
}

export function unfriend(otherUserId: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/friends/with/${encodeURIComponent(otherUserId)}`,
    { method: 'DELETE' },
  );
}
