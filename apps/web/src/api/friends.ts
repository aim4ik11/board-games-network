import type {
  DiscoverUserRow,
  FriendConnection,
  FriendRequestPayload,
  OkResponse,
  PaginatedMeta,
  PendingRequest,
} from '@boardgame/shared';
import { apiFetch } from '../lib/api';

export function fetchFriendsDiscover(params: {
  q?: string;
  city?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: DiscoverUserRow[]; meta: PaginatedMeta }> {
  const sp = new URLSearchParams();
  if (params.q?.trim()) {
    sp.set('q', params.q.trim());
  }
  if (params.city?.trim()) {
    sp.set('city', params.city.trim());
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

export function sendFriendRequest(toUserId: string): Promise<OkResponse> {
  return apiFetch<OkResponse>('/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ toUserId } satisfies FriendRequestPayload),
  });
}

export function acceptFriendRequest(
  fromUserId: string,
): Promise<OkResponse> {
  return apiFetch<OkResponse>(
    `/friends/requests/${encodeURIComponent(fromUserId)}/accept`,
    { method: 'POST' },
  );
}

export function declineFriendRequest(
  fromUserId: string,
): Promise<OkResponse> {
  return apiFetch<OkResponse>(
    `/friends/requests/${encodeURIComponent(fromUserId)}`,
    { method: 'DELETE' },
  );
}

export function cancelOutgoingRequest(
  toUserId: string,
): Promise<OkResponse> {
  return apiFetch<OkResponse>(
    `/friends/outgoing/${encodeURIComponent(toUserId)}`,
    { method: 'DELETE' },
  );
}

export function unfriend(otherUserId: string): Promise<OkResponse> {
  return apiFetch<OkResponse>(
    `/friends/with/${encodeURIComponent(otherUserId)}`,
    { method: 'DELETE' },
  );
}
