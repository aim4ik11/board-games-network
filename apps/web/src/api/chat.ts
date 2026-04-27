import { apiFetch } from '../lib/api';
import type { MessageView, PublicUserCard } from './types';

export type ConversationListItem = {
  id: string;
  type: string;
  title: string | null;
  playSessionId: string | null;
  updatedAt: string;
  otherUser: PublicUserCard | null;
  lastMessage: {
    body: string;
    createdAt: string;
    senderDisplayName: string;
  } | null;
};

export function fetchConversations(): Promise<ConversationListItem[]> {
  return apiFetch<ConversationListItem[]>('/conversations');
}

export function createDirectConversation(
  otherUserId: string,
): Promise<{ conversationId: string }> {
  return apiFetch<{ conversationId: string }>('/conversations/direct', {
    method: 'POST',
    body: JSON.stringify({ otherUserId }),
  });
}

export function createGroupConversation(params: {
  memberIds: string[];
  title?: string;
}): Promise<{ conversationId: string }> {
  return apiFetch<{ conversationId: string }>('/conversations/group', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function inviteConversationMember(
  conversationId: string,
  userId: string,
): Promise<void> {
  return apiFetch<void>(
    `/conversations/${encodeURIComponent(conversationId)}/members`,
    {
      method: 'POST',
      body: JSON.stringify({ userId }),
    },
  );
}

export function fetchConversationMessages(
  conversationId: string,
  params?: { page?: number; limit?: number },
): Promise<{
  conversation: {
    id: string;
    type: string;
    title: string | null;
    playSessionId: string | null;
  };
  data: MessageView[];
  members: Array<Pick<PublicUserCard, 'id' | 'displayName' | 'avatarUrl'>>;
  meta: { total: number; page: number; limit: number };
}> {
  const sp = new URLSearchParams();
  if (params?.page != null) {
    sp.set('page', String(params.page));
  }
  if (params?.limit != null) {
    sp.set('limit', String(params.limit));
  }
  const qs = sp.toString();
  return apiFetch(
    `/conversations/${encodeURIComponent(conversationId)}/messages${qs ? `?${qs}` : ''}`,
  );
}

export function postConversationMessage(
  conversationId: string,
  body: string,
): Promise<MessageView> {
  return apiFetch<MessageView>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ body }),
    },
  );
}
