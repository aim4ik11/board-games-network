import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { fetchGameBySlug } from '../api/games';
import { GameCollectionActions } from '../components/game-collection-actions';
import { gamesListSearchDefault } from '../lib/games-route-defaults';
import { queryKeys } from '../lib/query-keys';

const routeApi = getRouteApi('/games/$slug');

export function GameDetailPage() {
  const { slug } = routeApi.useParams();

  const gameQuery = useQuery({
    queryKey: queryKeys.games.detail(slug),
    queryFn: () => fetchGameBySlug(slug),
  });

  if (gameQuery.isLoading) {
    return (
      <section className="page">
        <p>Loading…</p>
      </section>
    );
  }

  if (gameQuery.isError) {
    return (
      <section className="page">
        <p className="error" role="alert">
          {gameQuery.error instanceof Error
            ? gameQuery.error.message
            : 'Game not found'}
        </p>
        <p>
          <Link
            to="/games"
            search={gamesListSearchDefault}
            className="text-link"
          >
            ← Back to catalog
          </Link>
        </p>
      </section>
    );
  }

  if (gameQuery.data === undefined) {
    return null;
  }

  const game = gameQuery.data;

  return (
    <article className="page game-detail">
      <p className="back">
        <Link to="/games" search={gamesListSearchDefault} className="text-link">
          ← Catalog
        </Link>
      </p>
      <div className="game-detail-head">
        {game.imageUrl ? (
          <img src={game.imageUrl} alt="" className="game-hero" />
        ) : (
          <div className="game-hero placeholder" aria-hidden />
        )}
        <div>
          <h1>{game.title}</h1>
          <dl className="game-meta">
            {game.yearPublished != null && (
              <>
                <dt>Year</dt>
                <dd>{game.yearPublished}</dd>
              </>
            )}
            {(game.minPlayers != null || game.maxPlayers != null) && (
              <>
                <dt>Players</dt>
                <dd>
                  {game.minPlayers ?? '?'}–{game.maxPlayers ?? '?'}
                </dd>
              </>
            )}
            {game.playTimeMin != null && (
              <>
                <dt>Play time</dt>
                <dd>{game.playTimeMin}+ min</dd>
              </>
            )}
          </dl>
          <p className="muted">
            {game.ratingCount > 0 && game.averageRating != null ? (
              <>
                Avg rating <strong>{game.averageRating.toFixed(1)}</strong> / 10
                ({game.ratingCount}{' '}
                {game.ratingCount === 1 ? 'rating' : 'ratings'})
              </>
            ) : (
              <>No ratings yet</>
            )}
            {' · '}
            {game.reviewCount} {game.reviewCount === 1 ? 'review' : 'reviews'}
          </p>
          <div className="game-collection-block">
            <h2 className="h-aside">Collection</h2>
            <GameCollectionActions slug={game.slug} />
          </div>
        </div>
      </div>
      {game.description && (
        <div className="prose">
          {game.description.split('\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}
    </article>
  );
}
