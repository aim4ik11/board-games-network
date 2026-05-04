import { useMutation, useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { fetchFriendsList } from '../api/friends';
import { createMeetupInvitation, fetchMeetup } from '../api/meetups';
import {
  MultiSelectPicker,
  type MultiSelectOption,
} from '../components/multi-select-picker';
import { Button } from '../components/ui';
import { queryKeys } from '../lib/query-keys';

const routeApi = getRouteApi('/meetups/$meetupId/invite');

export function MeetupInvitePage() {
  const { meetupId } = routeApi.useParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: queryKeys.meetups.detail(meetupId),
    queryFn: () => fetchMeetup(meetupId),
  });

  const friendsQuery = useQuery({
    queryKey: queryKeys.friends.list(),
    queryFn: fetchFriendsList,
  });

  const options = useMemo<MultiSelectOption[]>(() => {
    return (friendsQuery.data ?? []).map((friend) => ({
      id: friend.user.id,
      label: friend.user.displayName,
      description: friend.user.city,
      avatarUrl: friend.user.avatarUrl,
    }));
  }, [friendsQuery.data]);

  const invite = useMutation({
    mutationFn: async (userIds: string[]) => {
      const results = await Promise.allSettled(
        userIds.map((userId) => createMeetupInvitation(meetupId, userId)),
      );
      const failed = results.filter(
        (result) => result.status === 'rejected',
      ).length;
      return { failed, total: userIds.length };
    },
    onSuccess: ({ failed, total }) => {
      if (failed === 0) {
        setStatusMessage(
          `Sent ${total} invite${total === 1 ? '' : 's'} successfully.`,
        );
      } else {
        setStatusMessage(
          `Sent ${total - failed}/${total} invites. ${failed} failed.`,
        );
      }
      setSelectedIds([]);
    },
  });

  if (detailQuery.isLoading) {
    return (
      <section className="page">
        <p>Loading…</p>
      </section>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <section className="page">
        <p className="error" role="alert">
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : 'Meetup not found'}
        </p>
      </section>
    );
  }

  return (
    <section className="page meetup-create-page">
      <p className="back">
        <Link
          to="/meetups/$meetupId"
          params={{ meetupId }}
          className="text-link"
        >
          ← Back to meetup
        </Link>
      </p>
      <h1>Invite players</h1>
      <p className="muted">
        {detailQuery.data.title} ·{' '}
        {new Date(detailQuery.data.scheduledAt).toLocaleString()}
      </p>
      <form
        className="stack-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (selectedIds.length === 0) {
            setStatusMessage('Select at least one friend to send invites.');
            return;
          }
          setStatusMessage(null);
          invite.mutate(selectedIds);
        }}
      >
        <label className="field">
          <span>Friends</span>
          <MultiSelectPicker
            options={options}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            loading={friendsQuery.isLoading}
            searchPlaceholder="Search your friends by name"
            placeholder="Selected friends will receive meetup invites."
            emptyText="No matching friends found."
          />
        </label>
        {statusMessage && (
          <p className="muted" role="status">
            {statusMessage}
          </p>
        )}
        {invite.isError && (
          <p className="error" role="alert">
            {invite.error instanceof Error
              ? invite.error.message
              : 'Failed to send invites'}
          </p>
        )}
        <div className="button-row">
          <Button
            type="submit"
            disabled={invite.isPending || selectedIds.length === 0}
          >
            {invite.isPending ? 'Sending...' : 'Send invites'}
          </Button>
        </div>
      </form>
    </section>
  );
}
