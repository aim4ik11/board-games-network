import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { fetchGamesList } from '../api/games';
import { createMeetup } from '../api/meetups';
import { toDatetimeLocalValue } from '../lib/datetime-local';
import { gamesListSearchDefault } from '../lib/games-route-defaults';
import { queryKeys } from '../lib/query-keys';

const defaultWhen = () => {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return toDatetimeLocalValue(d.toISOString());
};

export function MeetupNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const gamesQuery = useQuery({
    queryKey: queryKeys.games.list({ q: '', page: 1 }),
    queryFn: () => fetchGamesList({ page: 1, limit: 100 }),
  });

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
    <section className="page narrow">
      <p className="back">
        <Link to="/meetups" search={{ page: 1, upcoming: 'true' }} className="text-link">
          ← Meetups
        </Link>
      </p>
      <h1>Host a meetup</h1>
      <form
        className="stack-form"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const gameId = String(fd.get('gameId') ?? '');
          const mp = fd.get('maxPlayers');
          create.mutate({
            title: String(fd.get('title') ?? '').trim(),
            scheduledAt: new Date(String(fd.get('scheduledAt') ?? '')).toISOString(),
            ...(gameId ? { gameId } : {}),
            location: String(fd.get('location') ?? '').trim() || undefined,
            ...(mp !== '' && mp != null
              ? { maxPlayers: Number(mp) }
              : {}),
            description: String(fd.get('description') ?? '').trim() || undefined,
          });
        }}
      >
        <label className="field">
          <span>Title</span>
          <input name="title" required className="input" maxLength={200} />
        </label>
        <label className="field">
          <span>When</span>
          <input
            name="scheduledAt"
            type="datetime-local"
            required
            className="input"
            defaultValue={defaultWhen()}
          />
        </label>
        <label className="field">
          <span>Game (optional)</span>
          <select name="gameId" className="input">
            <option value="">—</option>
            {gamesQuery.data?.data.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          <Link to="/games" search={gamesListSearchDefault} className="text-link">
            Browse catalog
          </Link>{' '}
          if the game is missing from the list.
        </p>
        <label className="field">
          <span>Location</span>
          <input name="location" className="input" maxLength={500} />
        </label>
        <label className="field">
          <span>Max players (includes you)</span>
          <input
            name="maxPlayers"
            type="number"
            min={2}
            max={500}
            className="input"
            placeholder="e.g. 4"
          />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            name="description"
            rows={4}
            className="input textarea"
            maxLength={4000}
          />
        </label>
        {create.isError && (
          <p className="error" role="alert">
            {create.error instanceof Error ? create.error.message : 'Could not create'}
          </p>
        )}
        <div className="button-row">
          <button type="submit" className="button" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </section>
  );
}
