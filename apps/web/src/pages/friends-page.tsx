import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { createDirectConversation } from '../api/chat';
import {
  acceptFriendRequest,
  cancelOutgoingRequest,
  declineFriendRequest,
  fetchFriendsDiscover,
  fetchFriendsList,
  fetchIncomingRequests,
  fetchOutgoingRequests,
  sendFriendRequest,
  unfriend,
} from '../api/friends';
import type { DiscoverUserRow, FriendshipRelationship } from '../api/types';
import type { FriendsTab } from '../lib/friends-route-defaults';
import { queryKeys } from '../lib/query-keys';

const routeApi = getRouteApi('/friends');

const TABS: { value: FriendsTab; label: string }[] = [
  { value: 'discover', label: 'Discover' },
  { value: 'friends', label: 'Friends' },
  { value: 'requests', label: 'Requests' },
];

function relationshipLabel(r: FriendshipRelationship): string {
  switch (r) {
    case 'friend':
      return 'Friends';
    case 'outgoing_pending':
      return 'Request sent';
    case 'incoming_pending':
      return 'Wants to connect';
    case 'blocked':
      return 'Blocked';
    default:
      return '';
  }
}

function invalidateFriends(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.friends.all });
}

export function FriendsPage() {
  const { tab, q, page } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const routerNavigate = useNavigate();
  const queryClient = useQueryClient();

  const discoverQuery = useQuery({
    queryKey: queryKeys.friends.discover({ q, page }),
    queryFn: () => fetchFriendsDiscover({ q, page, limit: 20 }),
    enabled: tab === 'discover',
  });

  const friendsQuery = useQuery({
    queryKey: queryKeys.friends.list(),
    queryFn: fetchFriendsList,
    enabled: tab === 'friends',
  });

  const incomingQuery = useQuery({
    queryKey: queryKeys.friends.incoming(),
    queryFn: fetchIncomingRequests,
    enabled: tab === 'requests',
  });

  const outgoingQuery = useQuery({
    queryKey: queryKeys.friends.outgoing(),
    queryFn: fetchOutgoingRequests,
    enabled: tab === 'requests',
  });

  const sendReq = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => invalidateFriends(queryClient),
  });
  const acceptReq = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => invalidateFriends(queryClient),
  });
  const declineReq = useMutation({
    mutationFn: declineFriendRequest,
    onSuccess: () => invalidateFriends(queryClient),
  });
  const cancelOut = useMutation({
    mutationFn: cancelOutgoingRequest,
    onSuccess: () => invalidateFriends(queryClient),
  });
  const unfriendMut = useMutation({
    mutationFn: unfriend,
    onSuccess: () => invalidateFriends(queryClient),
  });

  const openChat = useMutation({
    mutationFn: createDirectConversation,
    onSuccess: (data) => {
      void routerNavigate({
        to: '/messages/$conversationId',
        params: { conversationId: data.conversationId },
      });
    },
  });

  const totalDiscoverPages =
    discoverQuery.data != null
      ? Math.max(
          1,
          Math.ceil(discoverQuery.data.meta.total / discoverQuery.data.meta.limit),
        )
      : 1;

  return (
    <section className="page">
      <h1>Friends</h1>
      <nav className="segmented" aria-label="Friends section">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={t.value === tab ? 'active' : ''}
            onClick={() => {
              if (t.value === 'discover') {
                void navigate({ search: { tab: 'discover', q, page: 1 } });
              } else {
                void navigate({
                  search: { tab: t.value, q: '', page: 1 },
                });
              }
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'discover' && (
        <>
          <form
            className="search-row"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const nextQ = String(fd.get('q') ?? '');
              void navigate({ search: { tab: 'discover', q: nextQ, page: 1 } });
            }}
          >
            <input
              name="q"
              type="search"
              placeholder="Search by display name"
              defaultValue={q}
              className="input"
              aria-label="Search people"
            />
            <button type="submit" className="button">
              Search
            </button>
          </form>

          {discoverQuery.isLoading && <p>Loading…</p>}
          {discoverQuery.isError && (
            <p className="error" role="alert">
              {discoverQuery.error instanceof Error
                ? discoverQuery.error.message
                : 'Search failed'}
            </p>
          )}
          {discoverQuery.data && (
            <>
              <ul className="friend-rows">
                {discoverQuery.data.data.map((row: DiscoverUserRow) => (
                  <li key={row.id} className="friend-row">
                    <div className="friend-row-main">
                      <Link to="/u/$userId" params={{ userId: row.id }} className="text-link">
                        <strong>{row.displayName}</strong>
                      </Link>
                      {row.city && <span className="muted"> · {row.city}</span>}
                      {row.relationship !== 'none' && (
                        <span className="muted"> · {relationshipLabel(row.relationship)}</span>
                      )}
                    </div>
                    <DiscoverActions
                      row={row}
                      sendPending={sendReq.isPending}
                      onSend={() => sendReq.mutate(row.id)}
                    />
                  </li>
                ))}
              </ul>
              {discoverQuery.data.data.length === 0 && (
                <p className="muted">
                  {q.trim() ? 'No users match that search.' : 'Try searching by name.'}
                </p>
              )}
              <div className="pagination">
                <button
                  type="button"
                  className="button ghost"
                  disabled={page <= 1}
                  onClick={() => void navigate({ search: { tab, q, page: page - 1 } })}
                >
                  Previous
                </button>
                <span className="muted">
                  Page {page} of {totalDiscoverPages}
                </span>
                <button
                  type="button"
                  className="button ghost"
                  disabled={page >= totalDiscoverPages}
                  onClick={() => void navigate({ search: { tab, q, page: page + 1 } })}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'friends' && (
        <>
          {friendsQuery.isLoading && <p>Loading…</p>}
          {friendsQuery.isError && (
            <p className="error" role="alert">
              {friendsQuery.error instanceof Error
                ? friendsQuery.error.message
                : 'Failed to load friends'}
            </p>
          )}
          {friendsQuery.data && (
            <ul className="friend-rows">
              {friendsQuery.data.length === 0 ? (
                <p className="muted">You have no friends yet — try Discover.</p>
              ) : (
                friendsQuery.data.map((f) => (
                  <li key={f.friendshipId} className="friend-row">
                    <div className="friend-row-main">
                      <Link to="/u/$userId" params={{ userId: f.user.id }} className="text-link">
                        <strong>{f.user.displayName}</strong>
                      </Link>
                      {f.user.city && <span className="muted"> · {f.user.city}</span>}
                    </div>
                    <div className="button-row">
                      <button
                        type="button"
                        className="button small"
                        disabled={openChat.isPending}
                        onClick={() => openChat.mutate(f.user.id)}
                      >
                        Message
                      </button>
                      <button
                        type="button"
                        className="button small danger"
                        disabled={unfriendMut.isPending}
                        onClick={() => unfriendMut.mutate(f.user.id)}
                      >
                        Unfriend
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}

      {tab === 'requests' && (
        <div className="requests-grid">
          <div>
            <h2 className="h-aside">Incoming</h2>
            {incomingQuery.isLoading && <p>Loading…</p>}
            {incomingQuery.data?.length === 0 && (
              <p className="muted">No incoming requests.</p>
            )}
            <ul className="friend-rows">
              {incomingQuery.data?.map((r) => (
                <li key={r.friendshipId} className="friend-row">
                  <div className="friend-row-main">
                    <Link to="/u/$userId" params={{ userId: r.user.id }} className="text-link">
                      <strong>{r.user.displayName}</strong>
                    </Link>
                  </div>
                  <div className="button-row">
                    <button
                      type="button"
                      className="button small"
                      disabled={acceptReq.isPending}
                      onClick={() => acceptReq.mutate(r.user.id)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="button small ghost"
                      disabled={declineReq.isPending}
                      onClick={() => declineReq.mutate(r.user.id)}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="h-aside">Outgoing</h2>
            {outgoingQuery.isLoading && <p>Loading…</p>}
            {outgoingQuery.data?.length === 0 && (
              <p className="muted">No outgoing requests.</p>
            )}
            <ul className="friend-rows">
              {outgoingQuery.data?.map((r) => (
                <li key={r.friendshipId} className="friend-row">
                  <div className="friend-row-main">
                    <Link to="/u/$userId" params={{ userId: r.user.id }} className="text-link">
                      <strong>{r.user.displayName}</strong>
                    </Link>
                  </div>
                  <button
                    type="button"
                    className="button small ghost"
                    disabled={cancelOut.isPending}
                    onClick={() => cancelOut.mutate(r.user.id)}
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function DiscoverActions({
  row,
  sendPending,
  onSend,
}: {
  row: DiscoverUserRow;
  sendPending: boolean;
  onSend: () => void;
}) {
  if (row.relationship === 'friend') {
    return <span className="muted">Friends</span>;
  }
  if (row.relationship === 'outgoing_pending') {
    return <span className="muted">Pending</span>;
  }
  if (row.relationship === 'incoming_pending') {
    return <span className="muted">They invited you — check Requests</span>;
  }
  if (row.relationship === 'blocked') {
    return <span className="muted">Unavailable</span>;
  }
  return (
    <button type="button" className="button small" disabled={sendPending} onClick={onSend}>
      Add friend
    </button>
  );
}
