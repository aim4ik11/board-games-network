import type {
  ConversationListItem,
  ConversationMessages,
  MessageView,
} from '@boardgame/shared';
import { apiFetch } from '../lib/api';

export type {
  ConversationListItem,
  ConversationMessages,
} from '@boardgame/shared';

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
): Promise<ConversationMessages> {
  const sp = new URLSearchParams();
  if (params?.page != null) {
    sp.set('page', String(params.page));
  }
  if (params?.limit != null) {
    sp.set('limit', String(params.limit));
  }
  const qs = sp.toString();
  return apiFetch<ConversationMessages>(
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
