import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { fetchMyCollection } from '../api/collection';
import type { CollectionStatus } from '../api/types';
import { queryKeys } from '../lib/query-keys';

const routeApi = getRouteApi('/collection');

const TABS: { value: CollectionStatus; label: string }[] = [
  { value: 'OWNED', label: 'Owned' },
  { value: 'WISHLIST', label: 'Wishlist' },
  { value: 'PREVIOUSLY_OWNED', label: 'Previously owned' },
];

export function CollectionPage() {
  const { status } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const listQuery = useQuery({
    queryKey: queryKeys.collection.list(status),
    queryFn: () => fetchMyCollection(status),
  });

  return (
    <section className="page">
      <h1>My collection</h1>
      <nav className="segmented" aria-label="Collection filter">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={tab.value === status ? 'active' : ''}
            onClick={() => void navigate({ search: { status: tab.value } })}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {listQuery.isLoading && <p>Loading…</p>}
      {listQuery.isError && (
        <p className="error" role="alert">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load collection'}
        </p>
      )}
      {listQuery.data && (
        <>
          {listQuery.data.length === 0 ? (
            <p className="muted">No games in this list yet.</p>
          ) : (
            <ul className="game-grid">
              {listQuery.data.map((row) => (
                <li key={row.id}>
                  <Link
                    to="/games/$slug"
                    params={{ slug: row.game.slug }}
                    className="game-card"
                  >
                    {row.game.imageUrl ? (
                      <img
                        src={row.game.imageUrl}
                        alt=""
                        className="game-thumb"
                      />
                    ) : (
                      <div className="game-thumb placeholder" aria-hidden />
                    )}
                    <div className="game-card-body">
                      <span className="game-title">{row.game.title}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
