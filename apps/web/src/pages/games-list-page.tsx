import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { fetchGamesList } from '../api/games';
import { queryKeys } from '../lib/query-keys';

const routeApi = getRouteApi('/games');

export function GamesListPage() {
  const { q, page } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const listQuery = useQuery({
    queryKey: queryKeys.games.list({ q, page }),
    queryFn: () =>
      fetchGamesList({
        q: q.trim() || undefined,
        page,
        limit: 20,
      }),
  });

  const totalPages =
    listQuery.data != null
      ? Math.max(1, Math.ceil(listQuery.data.meta.total / listQuery.data.meta.limit))
      : 1;

  return (
    <section className="page">
      <h1>Games</h1>
      <form
        className="search-row"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const nextQ = String(fd.get('q') ?? '');
          void navigate({ search: { q: nextQ, page: 1 } });
        }}
      >
        <input
          name="q"
          type="search"
          placeholder="Search by title"
          defaultValue={q}
          className="input"
          aria-label="Search games"
        />
        <button type="submit" className="button">
          Search
        </button>
      </form>

      {listQuery.isLoading && <p>Loading…</p>}
      {listQuery.isError && (
        <p className="error" role="alert">
          {listQuery.error instanceof Error ? listQuery.error.message : 'Failed to load games'}
        </p>
      )}
      {listQuery.data && (
        <>
          <ul className="game-grid">
            {listQuery.data.data.map((game) => (
              <li key={game.id}>
                <Link
                  to="/games/$slug"
                  params={{ slug: game.slug }}
                  className="game-card"
                >
                  {game.imageUrl ? (
                    <img src={game.imageUrl} alt="" className="game-thumb" />
                  ) : (
                    <div className="game-thumb placeholder" aria-hidden />
                  )}
                  <div className="game-card-body">
                    <span className="game-title">{game.title}</span>
                    {game.yearPublished != null && (
                      <span className="muted">{game.yearPublished}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {listQuery.data.data.length === 0 && <p className="muted">No games match your search.</p>}
          <div className="pagination">
            <button
              type="button"
              className="button ghost"
              disabled={page <= 1}
              onClick={() => void navigate({ search: { q, page: page - 1 } })}
            >
              Previous
            </button>
            <span className="muted">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="button ghost"
              disabled={page >= totalPages}
              onClick={() => void navigate({ search: { q, page: page + 1 } })}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
