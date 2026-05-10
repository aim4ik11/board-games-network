import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  createGroupConversation,
  fetchConversations,
  type ConversationListItem,
} from '../../api/chat';
import { fetchFriendsList } from '../../api/friends';
import {
  Button,
  Modal,
  SuggestionMultiSelect,
  type SuggestionMultiSelectOption,
} from '../../components/ui';
import { getSharedChatSocket } from '../../lib/chat-socket';
import { getAccessToken } from '../../lib/auth-session';
import { queryKeys } from '../../lib/query-keys';
import styles from './messages-list-page.module.scss';

export function MessagesListPage() {
  const queryClient = useQueryClient();
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const listQuery = useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: fetchConversations,
  });
  const friendsQuery = useQuery({
    queryKey: queryKeys.friends.list(),
    queryFn: fetchFriendsList,
  });
  const createGroup = useMutation({
    mutationFn: () =>
      createGroupConversation({
        memberIds: selectedMemberIds,
        title: groupTitle.trim(),
      }),
    onSuccess: (result) => {
      setSelectedMemberIds([]);
      setGroupTitle('');
      setIsCreateModalOpen(false);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
      window.location.assign(
        `/messages/${encodeURIComponent(result.conversationId)}`,
      );
    },
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }
    const socket = getSharedChatSocket(token);

    const onNew = () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
    };

    socket.on('message:new', onNew);
    return () => {
      socket.off('message:new', onNew);
    };
  }, [queryClient]);

  const conversationTitle = (c: ConversationListItem) => {
    if (c.type === 'DIRECT') {
      return c.otherUser?.displayName ?? 'Direct chat';
    }
    if (c.type === 'SESSION') {
      return c.title?.trim() || 'Meetup chat';
    }
    if (c.title?.trim()) {
      return c.title;
    }
    return 'Group chat';
  };

  const friendOptions: SuggestionMultiSelectOption[] = (
    friendsQuery.data ?? []
  ).map((friend) => ({
    id: friend.user.id,
    label: friend.user.displayName,
    description: friend.user.city,
    avatarUrl: friend.user.avatarUrl,
  }));

  const avatarLabel = (c: ConversationListItem) =>
    conversationTitle(c).trim().charAt(0).toUpperCase() || 'C';

  return (
    <section className={`page ${styles.page}`}>
      <div className={`button-row ${styles.pageHead}`}>
        <h1>Messages</h1>
        <Button
          size="sm"
          className={styles.createTrigger}
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={14} aria-hidden="true" />
          Create chat
        </Button>
      </div>
      <Modal
        isOpen={isCreateModalOpen}
        title="Create Group Chat"
        onClose={() => setIsCreateModalOpen(false)}
      >
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !groupTitle.trim() ||
              selectedMemberIds.length === 0 ||
              createGroup.isPending
            ) {
              return;
            }
            createGroup.mutate();
          }}
        >
          <label className="field">
            <span>Title</span>
            <input
              className="input"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder="Set group title"
              maxLength={80}
              required
            />
          </label>
          <label className="field">
            <span>Members</span>
            <SuggestionMultiSelect
              options={friendOptions}
              selectedIds={selectedMemberIds}
              onChange={setSelectedMemberIds}
              searchPlaceholder="Find friends..."
              selectedEmptyText="Select at least one friend."
              emptyText="No friends match this search."
              loading={friendsQuery.isLoading}
            />
          </label>
          <div className="button-row modal-actions">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !groupTitle.trim() ||
                selectedMemberIds.length === 0 ||
                createGroup.isPending
              }
            >
              {createGroup.isPending ? 'Creating...' : 'Create chat'}
            </Button>
          </div>
          {createGroup.isError && (
            <p className="error" role="alert">
              {createGroup.error instanceof Error
                ? createGroup.error.message
                : 'Failed to create group chat'}
            </p>
          )}
        </form>
      </Modal>
      {listQuery.isLoading && <p>Loading…</p>}
      {listQuery.isError && (
        <p className="error" role="alert">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load conversations'}
        </p>
      )}
      {listQuery.data && (
        <ul className="conversation-list">
          {listQuery.data.length === 0 ? (
            <p className="muted">
              No conversations yet. Open a friend and tap Message.
            </p>
          ) : (
            listQuery.data.map((c) => (
              <li key={c.id}>
                <a
                  href={`/messages/${encodeURIComponent(c.id)}`}
                  className="conversation-row"
                >
                  <div className="conversation-row-head">
                    <span className="conversation-row-avatar" aria-hidden>
                      {c.otherUser?.avatarUrl ? (
                        <img
                          src={c.otherUser.avatarUrl}
                          alt=""
                          className="conversation-row-avatar-image"
                        />
                      ) : (
                        avatarLabel(c)
                      )}
                    </span>
                    <div className="conversation-row-title">
                      {conversationTitle(c)}
                    </div>
                    <span className="conversation-row-time muted">
                      {c.lastMessage?.createdAt
                        ? new Date(c.lastMessage.createdAt).toLocaleTimeString(
                            [],
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            },
                          )
                        : ''}
                    </span>
                  </div>
                  {c.lastMessage && (
                    <div className="conversation-row-preview muted">
                      <span>{c.lastMessage.senderDisplayName}: </span>
                      {c.lastMessage.body.length > 80
                        ? `${c.lastMessage.body.slice(0, 80)}…`
                        : c.lastMessage.body}
                    </div>
                  )}
                </a>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
