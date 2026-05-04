import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { UserPlus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  acceptFriendRequest,
  cancelOutgoingRequest,
  declineFriendRequest,
  fetchFriendsDiscover,
  fetchFriendsList,
  fetchIncomingRequests,
  fetchOutgoingRequests,
  sendFriendRequest,
} from '../api/friends';
import type { DiscoverUserRow } from '../api/types';
import { Button } from '../components/ui';
import { UserIdentity } from '../components/user-identity';
import { useAuthMe } from '../hooks/use-auth-me';
import type { FriendsTab } from '../lib/friends-route-defaults';
import { queryKeys } from '../lib/query-keys';

const routeApi = getRouteApi('/friends');

const TABS: { value: FriendsTab; label: string }[] = [
  { value: 'discover', label: 'Discover' },
  { value: 'friends', label: 'Friends' },
  { value: 'requests', label: 'Requests' },
];

function invalidateFriends(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.friends.all });
}

export function FriendsPage() {
  const { tab, q, city, page } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const queryClient = useQueryClient();
  const me = useAuthMe();
  const meCity = me.data?.city?.trim() ?? '';
  const effectiveCity = city.trim() || meCity;

  const discoverQuery = useQuery({
    queryKey: queryKeys.friends.discover({ q, city: effectiveCity, page }),
    queryFn: () =>
      fetchFriendsDiscover({
        q,
        city: effectiveCity,
        page,
        limit: 20,
      }),
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
  const totalDiscoverPages =
    discoverQuery.data != null
      ? Math.max(
          1,
          Math.ceil(
            discoverQuery.data.meta.total / discoverQuery.data.meta.limit,
          ),
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
                void navigate({
                  search: { tab: 'discover', q, city, page: 1 },
                });
              } else {
                void navigate({
                  search: { tab: t.value, q: '', city: '', page: 1 },
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
              const nextCityRaw = String(fd.get('city') ?? '').trim();
              void navigate({
                search: {
                  tab: 'discover',
                  q: nextQ,
                  city: nextCityRaw,
                  page: 1,
                },
              });
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
            <input
              key={`discover-city-${city || meCity}`}
              name="city"
              type="search"
              placeholder={meCity || 'Filter by city'}
              defaultValue={city || meCity}
              className="input discover-city-input"
              aria-label="Filter by city"
            />
            <Button type="submit">Search</Button>
          </form>
          <p className="muted discover-city-hint">
            {effectiveCity
              ? `Filtering by city: ${effectiveCity}.`
              : 'Showing people from all cities.'}
          </p>

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
              <ul className="user-card-grid discover-user-grid">
                {discoverQuery.data.data.map((row: DiscoverUserRow) => (
                  <UserActionCard
                    key={row.id}
                    userId={row.id}
                    displayName={row.displayName}
                    avatarUrl={row.avatarUrl}
                    subtitle={row.city}
                    isCurrentUser={row.id === me.data?.id}
                    action={discoverActionFromRow({
                      row,
                      sendPending: sendReq.isPending,
                      onSend: () => sendReq.mutate(row.id),
                    })}
                  />
                ))}
              </ul>
              {discoverQuery.data.data.length === 0 && (
                <p className="muted">
                  {q.trim() || effectiveCity.trim()
                    ? 'No users match these filters.'
                    : 'Try searching by name.'}
                </p>
              )}
              <div className="pagination">
                <Button
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() =>
                    void navigate({
                      search: { tab, q, city, page: page - 1 },
                    })
                  }
                >
                  Previous
                </Button>
                <span className="muted">
                  Page {page} of {totalDiscoverPages}
                </span>
                <Button
                  variant="ghost"
                  disabled={page >= totalDiscoverPages}
                  onClick={() =>
                    void navigate({
                      search: { tab, q, city, page: page + 1 },
                    })
                  }
                >
                  Next
                </Button>
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
            <>
              {friendsQuery.data.length === 0 ? (
                <p className="muted">You have no friends yet — try Discover.</p>
              ) : (
                <ul className="user-card-grid">
                  {friendsQuery.data.map((f) => (
                    <li key={f.friendshipId} className="user-card">
                      <UserIdentity
                        userId={f.user.id}
                        displayName={f.user.displayName}
                        avatarUrl={f.user.avatarUrl}
                        subtitle={f.user.city}
                        isCurrentUser={f.user.id === me.data?.id}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
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
            <ul className="user-card-grid requests-user-grid">
              {incomingQuery.data?.map((r) => (
                <UserActionCard
                  key={r.friendshipId}
                  userId={r.user.id}
                  displayName={r.user.displayName}
                  avatarUrl={r.user.avatarUrl}
                  cardClassName="requests-user-card"
                  isCurrentUser={r.user.id === me.data?.id}
                  action={{
                    kind: 'custom',
                    content: (
                      <div className="button-row requests-actions requests-actions-floating">
                        <Button
                          size="sm"
                          disabled={acceptReq.isPending}
                          onClick={() => acceptReq.mutate(r.user.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={declineReq.isPending}
                          onClick={() => declineReq.mutate(r.user.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    ),
                  }}
                />
              ))}
            </ul>
          </div>
          <div>
            <h2 className="h-aside">Outgoing</h2>
            {outgoingQuery.isLoading && <p>Loading…</p>}
            {outgoingQuery.data?.length === 0 && (
              <p className="muted">No outgoing requests.</p>
            )}
            <ul className="user-card-grid requests-user-grid">
              {outgoingQuery.data?.map((r) => (
                <UserActionCard
                  key={r.friendshipId}
                  userId={r.user.id}
                  displayName={r.user.displayName}
                  avatarUrl={r.user.avatarUrl}
                  cardClassName="requests-user-card"
                  isCurrentUser={r.user.id === me.data?.id}
                  action={{
                    kind: 'cancel',
                    disabled: cancelOut.isPending,
                    onClick: () => cancelOut.mutate(r.user.id),
                    label: `Cancel request to ${r.user.displayName}`,
                  }}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

type DiscoverActionContext = {
  row: DiscoverUserRow;
  sendPending: boolean;
  onSend: () => void;
};

type UserCardAction =
  | { kind: 'add'; onClick: () => void; disabled?: boolean; label: string }
  | { kind: 'cancel'; onClick: () => void; disabled?: boolean; label: string }
  | { kind: 'status'; text: string }
  | { kind: 'custom'; content: ReactNode };

function discoverActionFromRow({
  row,
  sendPending,
  onSend,
}: DiscoverActionContext): UserCardAction {
  if (row.relationship === 'friend') {
    return { kind: 'status', text: 'Friends' };
  }
  if (row.relationship === 'outgoing_pending') {
    return { kind: 'status', text: 'Pending' };
  }
  if (row.relationship === 'incoming_pending') {
    return { kind: 'status', text: 'Check Requests' };
  }
  if (row.relationship === 'blocked') {
    return { kind: 'status', text: 'Unavailable' };
  }
  return {
    kind: 'add',
    disabled: sendPending,
    onClick: onSend,
    label: `Send friend request to ${row.displayName}`,
  };
}

function UserActionCard({
  userId,
  displayName,
  avatarUrl,
  subtitle,
  isCurrentUser,
  size = 'md',
  layout = 'stacked',
  cardClassName,
  identityClassName,
  action,
}: {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  subtitle?: string | null;
  isCurrentUser: boolean;
  size?: 'sm' | 'md';
  layout?: 'stacked' | 'inline';
  cardClassName?: string;
  identityClassName?: string;
  action: UserCardAction;
}) {
  return (
    <li
      className={`user-card discover-user-card ${cardClassName ?? ''}`.trim()}
    >
      <div className="discover-user-card-main">
        <UserIdentity
          userId={userId}
          displayName={displayName}
          avatarUrl={avatarUrl}
          subtitle={subtitle}
          size={size}
          layout={layout}
          className={identityClassName}
          isCurrentUser={isCurrentUser}
        />
      </div>
      <UserCardActionView action={action} />
    </li>
  );
}

function UserCardActionView({ action }: { action: UserCardAction }) {
  if (action.kind === 'status') {
    return <span className="discover-user-card-tag muted">{action.text}</span>;
  }
  if (action.kind === 'custom') {
    return action.content;
  }
  if (action.kind === 'cancel') {
    return (
      <div className="button-row requests-actions requests-actions-floating">
        <Button
          variant="ghost"
          size="sm"
          className="requests-icon-action"
          disabled={action.disabled}
          onClick={action.onClick}
          title={action.label}
          aria-label={action.label}
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </div>
    );
  }
  return (
    <Button
      size="sm"
      className="discover-user-card-add"
      disabled={action.disabled}
      onClick={action.onClick}
      title={action.label}
      aria-label={action.label}
    >
      <UserPlus size={16} aria-hidden="true" />
    </Button>
  );
}
