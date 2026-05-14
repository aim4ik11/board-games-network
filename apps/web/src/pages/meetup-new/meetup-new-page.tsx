import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { createMeetup, type PlaySessionVisibility } from '../../api/meetups';
import { MeetupForm } from '../../components/meetup-form';
import { toDatetimeLocalValue } from '../../lib/datetime-local';
import { meetupsSearchDefault } from '../../lib/meetups-route-defaults';
import { queryKeys } from '../../lib/query-keys';
import styles from './meetup-new-page.module.scss';

const defaultWhen = () => {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return toDatetimeLocalValue(d.toISOString());
};

export function MeetupNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: createMeetup,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetups.all });
      void navigate({
        to: '/meetups/$meetupId',
        params: { meetupId: data.id },
      });
    },
  });

  return (
    <section className={`page meetup-create-page ${styles.root}`}>
      <p className="back">
        <Link
          to="/meetups"
          search={meetupsSearchDefault}
          className="text-link"
        >
          ← Meetups
        </Link>
      </p>
      <h1>Host a meetup</h1>
      <MeetupForm
        initialValues={{
          scheduledAtLocal: defaultWhen(),
          visibility: 'PUBLIC' as PlaySessionVisibility,
        }}
        onSubmit={(payload) => create.mutate(payload)}
        isSubmitting={create.isPending}
        submitLabel="Create"
      />
      {create.isError && (
        <p className="error" role="alert">
          {create.error instanceof Error
            ? create.error.message
            : 'Could not create'}
        </p>
      )}
    </section>
  );
}
