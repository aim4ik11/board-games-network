import type {
  CreateMeetupPayload,
  MeetupDetail,
  MeetupListItem,
  PaginatedMeta,
  PatchMeetupPayload,
} from '@boardgame/shared';
import { apiFetch } from '../lib/api';

export type {
  CreateMeetupPayload,
  MeetupDetail,
  MeetupListItem,
  PatchMeetupPayload,
  PlaySessionVisibility,
} from '@boardgame/shared';

export function fetchMeetups(params: {
  page?: number;
  limit?: number;
  upcoming?: 'true' | 'false';
  from?: string;
  to?: string;
  gameId?: string;
  visibility?: 'ALL' | 'PUBLIC' | 'FRIENDS';
  joined?: 'me';
  q?: string;
}): Promise<{ data: MeetupListItem[]; meta: PaginatedMeta }> {
  const sp = new URLSearchParams();
  if (params.page != null) {
    sp.set('page', String(params.page));
  }
  if (params.limit != null) {
    sp.set('limit', String(params.limit));
  }
  if (params.upcoming != null) {
    sp.set('upcoming', params.upcoming);
  }
  if (params.from != null && params.from.length > 0) {
    sp.set('from', params.from);
  }
  if (params.to != null && params.to.length > 0) {
    sp.set('to', params.to);
  }
  if (params.gameId != null && params.gameId.length > 0) {
    sp.set('gameId', params.gameId);
  }
  if (params.visibility != null && params.visibility !== 'ALL') {
    sp.set('visibility', params.visibility);
  }
  if (params.joined != null) {
    sp.set('joined', params.joined);
  }
  if (params.q != null && params.q.trim().length > 0) {
    sp.set('q', params.q.trim());
  }
  const qs = sp.toString();
  return apiFetch<{ data: MeetupListItem[]; meta: PaginatedMeta }>(
    `/meetups${qs ? `?${qs}` : ''}`,
  );
}

export function fetchMeetup(id: string): Promise<MeetupDetail> {
  return apiFetch<MeetupDetail>(`/meetups/${encodeURIComponent(id)}`);
}

export function createMeetup(body: CreateMeetupPayload): Promise<MeetupDetail> {
  return apiFetch<MeetupDetail>('/meetups', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function patchMeetup(
  id: string,
  body: PatchMeetupPayload,
): Promise<MeetupDetail> {
  return apiFetch<MeetupDetail>(`/meetups/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function cancelMeetup(id: string): Promise<MeetupDetail> {
  return apiFetch<MeetupDetail>(`/meetups/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  });
}

export function joinMeetup(id: string): Promise<MeetupDetail> {
  return apiFetch<MeetupDetail>(`/meetups/${encodeURIComponent(id)}/join`, {
    method: 'POST',
  });
}

export function leaveMeetup(id: string): Promise<MeetupDetail> {
  return apiFetch<MeetupDetail>(`/meetups/${encodeURIComponent(id)}/leave`, {
    method: 'POST',
  });
}

export function createMeetupInvitation(
  meetupId: string,
  userId: string,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/meetups/${encodeURIComponent(meetupId)}/invitations`,
    {
      method: 'POST',
      body: JSON.stringify({ userId }),
    },
  );
}
