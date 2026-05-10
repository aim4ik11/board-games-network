import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { fetchMeetup, patchMeetup } from '../../api/meetups';
import { MeetupForm } from '../../components/meetup-form';
import { toDatetimeLocalValue } from '../../lib/datetime-local';
import { queryKeys } from '../../lib/query-keys';
import styles from './meetup-edit-page.module.scss';

const routeApi = getRouteApi('/meetups/$meetupId/edit');

export function MeetupEditPage() {
  const { meetupId } = routeApi.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: queryKeys.meetups.detail(meetupId),
    queryFn: () => fetchMeetup(meetupId),
  });

  const save = useMutation({
    mutationFn: (body: Parameters<typeof patchMeetup>[1]) =>
      patchMeetup(meetupId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetups.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.meetups.detail(meetupId),
      });
      void navigate({
        to: '/meetups/$meetupId',
        params: { meetupId },
      });
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

  const meetup = detailQuery.data;

  return (
    <section className={`page meetup-create-page ${styles.root}`}>
      <p className="back">
        <Link
          to="/meetups/$meetupId"
          params={{ meetupId }}
          className="text-link"
        >
          ← Back to meetup
        </Link>
      </p>
      <h1>Edit meetup</h1>
      <MeetupForm
        key={`${meetup.id}:${meetup.scheduledAt}:${meetup.maxPlayers ?? 'na'}`}
        initialValues={{
          title: meetup.title,
          scheduledAtLocal: toDatetimeLocalValue(meetup.scheduledAt),
          game: meetup.game
            ? { id: meetup.game.id, title: meetup.game.title }
            : null,
          location: meetup.location ?? '',
          maxPlayers: meetup.maxPlayers,
          description: meetup.description ?? '',
          visibility: meetup.visibility,
        }}
        onSubmit={(payload) => save.mutate(payload)}
        isSubmitting={save.isPending}
        submitLabel="Save changes"
      />
      {save.isError && (
        <p className="error" role="alert">
          {save.error instanceof Error ? save.error.message : 'Save failed'}
        </p>
      )}
    </section>
  );
}
