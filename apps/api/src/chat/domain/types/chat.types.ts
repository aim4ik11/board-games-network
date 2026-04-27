import type { PublicUserCard } from '../../../auth/domain/types/auth-user.types';

export type ConversationMemberView = Pick<
  PublicUserCard,
  'id' | 'displayName' | 'avatarUrl'
>;

export type MessageView = {
  id: string;
  conversationId: string;
  body: string;
  createdAt: string;
  sender: { id: string; displayName: string };
};

export type ConversationListItemView = {
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

export type ConversationMessagesView = {
  conversation: {
    id: string;
    type: string;
    title: string | null;
    playSessionId: string | null;
  };
  data: MessageView[];
  members: ConversationMemberView[];
  meta: { total: number; page: number; limit: number };
};
