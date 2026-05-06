import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import {
  fetchConversationMessages,
  inviteConversationMember,
  postConversationMessage,
} from '../api/chat';
import { fetchFriendsList } from '../api/friends';
import type { MessageView } from '../api/types';
import { useAuthMe } from '../hooks/use-auth-me';
import { getSharedChatSocket } from '../lib/chat-socket';
import { getAccessToken } from '../lib/auth-session';
import { queryKeys } from '../lib/query-keys';
import {
  Button,
  Modal,
  SuggestionMultiSelect,
  type SuggestionMultiSelectOption,
} from '../components/ui';

const routeApi = getRouteApi('/messages/$conversationId');
const MSG_PAGE = 1;
const MSG_LIMIT = 100;

type MessagesQueryData = Awaited<ReturnType<typeof fetchConversationMessages>>;

export function MessagesThreadPage() {
  const { conversationId } = routeApi.useParams();
  const queryClient = useQueryClient();
  const me = useAuthMe();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);

  const messagesQuery = useQuery({
    queryKey: queryKeys.chat.messages(conversationId, MSG_PAGE),
    queryFn: () =>
      fetchConversationMessages(conversationId, {
        page: MSG_PAGE,
        limit: MSG_LIMIT,
      }),
  });
  const friendsQuery = useQuery({
    queryKey: queryKeys.friends.list(),
    queryFn: fetchFriendsList,
  });

  const send = useMutation({
    mutationFn: (body: string) => postConversationMessage(conversationId, body),
    onSuccess: (msg) => {
      queryClient.setQueryData<MessagesQueryData>(
        queryKeys.chat.messages(conversationId, MSG_PAGE),
        (prev) => {
          if (!prev) {
            return prev;
          }
          if (prev.data.some((m) => m.id === msg.id)) {
            return prev;
          }
          return {
            ...prev,
            data: [...prev.data, msg],
            meta: { ...prev.meta, total: prev.meta.total + 1 },
          };
        },
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
    },
  });
  const invite = useMutation({
    mutationFn: async (userIds: string[]) => {
      await Promise.all(
        userIds.map((userId) =>
          inviteConversationMember(conversationId, userId),
        ),
      );
    },
    onSuccess: () => {
      setIsInviteModalOpen(false);
      setSelectedInviteIds([]);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(conversationId, MSG_PAGE),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
    },
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }
    const socket = getSharedChatSocket(token);

    const onNew = (payload: {
      conversationId: string;
      message: MessageView;
    }) => {
      if (payload.conversationId !== conversationId) {
        return;
      }
      queryClient.setQueryData<MessagesQueryData>(
        queryKeys.chat.messages(conversationId, MSG_PAGE),
        (prev) => {
          if (!prev) {
            return prev;
          }
          if (prev.data.some((m) => m.id === payload.message.id)) {
            return prev;
          }
          return {
            ...prev,
            data: [...prev.data, payload.message],
            meta: { ...prev.meta, total: prev.meta.total + 1 },
          };
        },
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
    };

    const joinCurrentConversation = () => {
      socket.emit(
        'join',
        { conversationId },
        (result?: { ok?: boolean; error?: string }) => {
          if (!result?.ok) {
            console.warn(
              `Failed to join chat room for ${conversationId}: ${result?.error ?? 'unknown error'}`,
            );
          }
        },
      );
    };

    socket.on('message:new', onNew);
    socket.on('connect', joinCurrentConversation);
    if (socket.connected) {
      joinCurrentConversation();
    }

    return () => {
      socket.emit('leave', { conversationId });
      socket.off('connect', joinCurrentConversation);
      socket.off('message:new', onNew);
    };
  }, [conversationId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data?.data.length]);

  useEffect(() => {
    document.body.classList.add('chat-route-active');
    return () => {
      document.body.classList.remove('chat-route-active');
    };
  }, []);

  const myId = me.data?.id;
  const myDisplayName = me.data?.displayName ?? 'You';
  const initialFromName = (name: string) =>
    name.trim().charAt(0).toUpperCase() || '?';
  const memberById = new Map(
    (messagesQuery.data?.members ?? []).map((member) => [member.id, member]),
  );
  const inviteOptions =
    friendsQuery.data?.filter((friend) => !memberById.has(friend.user.id)) ??
    [];
  const inviteOptionItems: SuggestionMultiSelectOption[] = inviteOptions.map(
    (friend) => ({
      id: friend.user.id,
      label: friend.user.displayName,
      description: friend.user.city,
      avatarUrl: friend.user.avatarUrl,
    }),
  );
  const conversationLabel =
    messagesQuery.data?.conversation.type === 'DIRECT'
      ? (messagesQuery.data.members.find((m) => m.id !== myId)?.displayName ??
        'Direct chat')
      : messagesQuery.data?.conversation.title?.trim() ||
        (messagesQuery.data?.conversation.type === 'SESSION'
          ? 'Meetup chat'
          : 'Group chat');

  return (
    <section className="page chat-thread-page">
      <p className="back">
        <Link to="/messages" className="text-link">
          ← Inbox
        </Link>
      </p>
      {messagesQuery.data && (
        <div className="button-row chat-thread-head">
          <h1>{conversationLabel}</h1>
          {messagesQuery.data.conversation.type === 'GROUP' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
              disabled={inviteOptions.length === 0}
            >
              Invite people
            </Button>
          )}
        </div>
      )}
      <Modal
        isOpen={isInviteModalOpen}
        title="Invite to group chat"
        onClose={() => {
          setIsInviteModalOpen(false);
          setSelectedInviteIds([]);
        }}
      >
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedInviteIds.length === 0 || invite.isPending) {
              return;
            }
            invite.mutate(selectedInviteIds);
          }}
        >
          <SuggestionMultiSelect
            options={inviteOptionItems}
            selectedIds={selectedInviteIds}
            onChange={setSelectedInviteIds}
            searchPlaceholder="Search friends..."
            selectedEmptyText="Choose friends to invite."
            emptyText="No available friends to invite."
            loading={friendsQuery.isLoading}
          />
          <div className="button-row modal-actions">
            <Button
              variant="ghost"
              onClick={() => {
                setIsInviteModalOpen(false);
                setSelectedInviteIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={selectedInviteIds.length === 0 || invite.isPending}
            >
              {invite.isPending ? 'Inviting...' : 'Send invites'}
            </Button>
          </div>
          {invite.isError && (
            <p className="error" role="alert">
              {invite.error instanceof Error
                ? invite.error.message
                : 'Invitation failed'}
            </p>
          )}
        </form>
      </Modal>
      {messagesQuery.isLoading && <p>Loading…</p>}
      {messagesQuery.isError && (
        <p className="error" role="alert">
          {messagesQuery.error instanceof Error
            ? messagesQuery.error.message
            : 'Could not load messages'}
        </p>
      )}
      {messagesQuery.data && (
        <>
          <div className="chat-messages">
            {messagesQuery.data.data.map((m, index, all) => {
              const mine = myId != null && m.sender.id === myId;
              const next = all[index + 1];
              const isLastInSenderRun = !next || next.sender.id !== m.sender.id;
              const senderName = mine ? myDisplayName : m.sender.displayName;
              const senderMember = memberById.get(m.sender.id);
              return (
                <div
                  key={m.id}
                  className={`chat-bubble-wrap ${mine ? 'mine' : 'theirs'}`}
                >
                  {!mine && (
                    <div
                      className={`chat-avatar ${isLastInSenderRun ? '' : 'chat-avatar--ghost'}`.trim()}
                      aria-hidden
                    >
                      {senderMember?.avatarUrl ? (
                        <img
                          src={senderMember.avatarUrl}
                          alt=""
                          className="chat-avatar-image"
                        />
                      ) : (
                        initialFromName(senderName)
                      )}
                    </div>
                  )}
                  <div className="chat-bubble">
                    <div className="chat-body">{m.body}</div>
                    {isLastInSenderRun && (
                      <div className="chat-meta muted">
                        <span className="chat-sender">
                          {mine ? 'You' : senderName}
                        </span>
                        <span className="chat-time">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <form
            className="chat-compose"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const text = String(fd.get('body') ?? '').trim();
              if (!text) {
                return;
              }
              send.mutate(text);
              e.currentTarget.reset();
            }}
          >
            <input
              name="body"
              className="input"
              placeholder="Write a message…"
              autoComplete="off"
              disabled={send.isPending}
            />
            <button type="submit" className="button" disabled={send.isPending}>
              Send
            </button>
          </form>
          {send.isError && (
            <p className="error" role="alert">
              {send.error instanceof Error ? send.error.message : 'Send failed'}
            </p>
          )}
        </>
      )}
    </section>
  );
}
