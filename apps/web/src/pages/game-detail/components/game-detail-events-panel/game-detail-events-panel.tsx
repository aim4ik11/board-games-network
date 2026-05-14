import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Clock, MapPin, Plus } from 'lucide-react';
import { fetchMeetups } from '../../../../api/meetups';
import { UserIdentity } from '../../../../components/user-identity';
import { queryKeys } from '../../../../lib/query-keys';
import styles from './game-detail-events-panel.module.scss';

function formatMeetupSchedule(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function meetupDateParts(iso: string): { month: string; day: string } {
  const date = new Date(iso);
  return {
    month: date.toLocaleString(undefined, { month: 'short' }).toUpperCase(),
    day: String(date.getDate()),
  };
}

function spotsLabel(
  joinedParticipantCount: number,
  maxPlayers: number | null,
): string {
  if (maxPlayers == null) {
    return `${1 + joinedParticipantCount} attending`;
  }
  const used = 1 + joinedParticipantCount;
  if (used >= maxPlayers) {
    return `${used}/${maxPlayers} full`;
  }
  return `${used}/${maxPlayers} spots`;
}

export function GameDetailEventsPanel({ gameId }: { gameId: string }) {
  const meetupsQuery = useQuery({
    queryKey: queryKeys.meetups.list({
      page: 1,
      upcoming: 'true',
      gameId,
      visibility: 'ALL',
      q: '',
      joined: '',
    }),
    queryFn: () =>
      fetchMeetups({
        page: 1,
        limit: 20,
        upcoming: 'true',
        gameId,
      }),
  });

  const meetups = meetupsQuery.data?.data ?? [];

  return (
    <section className={styles.stack}>
      <div className={styles.toolbar}>
        <p className="muted" style={{ margin: 0 }}>
          Upcoming meetups for this game
        </p>
        <Link to="/meetups/new" className={styles.createBtn}>
          <Plus size={16} aria-hidden />
          Create Event
        </Link>
      </div>

      {meetupsQuery.isLoading && <p className="muted">Loading events…</p>}
      {meetupsQuery.isError && (
        <p className="error" role="alert">
          {meetupsQuery.error instanceof Error
            ? meetupsQuery.error.message
            : 'Failed to load events'}
        </p>
      )}

      {meetupsQuery.data && meetups.length === 0 && (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyTitle}>No Upcoming Events</h3>
          <p className={styles.emptyText}>
            There are no meetups scheduled for this game yet. Host one and invite
            players from the community.
          </p>
          <Link to="/meetups/new" className={styles.createBtn}>
            <Plus size={16} aria-hidden />
            Create the First Event
          </Link>
        </div>
      )}

      {meetups.length > 0 && (
        <div className={styles.grid}>
          {meetups.map((meetup) => {
            const { month, day } = meetupDateParts(meetup.scheduledAt);
            const isOnline =
              meetup.location != null &&
              /online|discord|zoom|tabletop simulator/i.test(meetup.location);

            return (
              <Link
                key={meetup.id}
                to="/meetups/$meetupId"
                params={{ meetupId: meetup.id }}
                className={styles.card}
              >
                <div className={styles.cardBanner}>
                  <div className={styles.cardBannerOverlay} aria-hidden />
                  <div className={styles.dateBadge}>
                    <span className={styles.dateMonth}>{month}</span>
                    <span className={styles.dateDay}>{day}</span>
                  </div>
                  <div className={styles.locationBadge}>
                    {isOnline ? (
                      <>
                        <MapPin size={12} aria-hidden />
                        Online
                      </>
                    ) : meetup.location ? (
                      <>
                        <MapPin size={12} aria-hidden />
                        Local
                      </>
                    ) : (
                      <>
                        <MapPin size={12} aria-hidden />
                        TBD
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{meetup.title}</h3>
                  <div className={styles.cardMeta}>
                    <Clock size={14} aria-hidden />
                    {formatMeetupSchedule(meetup.scheduledAt)}
                  </div>
                  {meetup.location && (
                    <p className={styles.cardDesc}>{meetup.location}</p>
                  )}

                  <div className={styles.cardFooter}>
                    <div className={styles.hostBlock}>
                      <UserIdentity
                        userId={meetup.host.id}
                        displayName={meetup.host.displayName}
                        avatarUrl={meetup.host.avatarUrl}
                        subtitle="Hosted by"
                        size="sm"
                        layout="stacked"
                      />
                    </div>
                    <div className={styles.spotsBlock}>
                      <div className={styles.spotsLabel}>Attendees</div>
                      <div className={styles.spotsValue}>
                        {spotsLabel(meetup.joinedParticipantCount, meetup.maxPlayers)}
                      </div>
                    </div>
                  </div>

                  <span className={styles.cardCta}>View Event</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
