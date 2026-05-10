import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { fetchMyCollection } from '../../api/collection';
import type { CollectionStatus } from '../../api/types';
import { queryKeys } from '../../lib/query-keys';
import seg from '../../components/ui/segmented.module.scss';
import cards from '../../styles/game-cards.module.scss';
import styles from './collection-page.module.scss';

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

  const count = listQuery.data?.length;

  return (
    <section className={`page ${styles.page}`}>
      <header className={styles.toolbar}>
        <h1>My collection</h1>
        {typeof count === 'number' ? (
          <span className={styles.stat}>{count} games in this list</span>
        ) : null}
      </header>
      <nav className={seg.root} aria-label="Collection filter">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={tab.value === status ? seg.tabActive : seg.tab}
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
            <ul className={cards.gameGrid}>
              {listQuery.data.map((row) => (
                <li key={row.id}>
                  <Link
                    to="/games/$slug"
                    params={{ slug: row.game.slug }}
                    className={cards.gameCard}
                  >
                    {row.game.imageUrl ? (
                      <img
                        src={row.game.imageUrl}
                        alt=""
                        className={cards.gameThumb}
                      />
                    ) : (
                      <div className={cards.gameThumbPlaceholder} aria-hidden />
                    )}
                    <div className={cards.gameCardBody}>
                      <span className={cards.gameTitle}>{row.game.title}</span>
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
