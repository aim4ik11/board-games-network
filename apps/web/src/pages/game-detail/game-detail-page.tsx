import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import type { GameDetail } from '@boardgame/shared';
import {
  Clock,
  Share2,
  Star,
  Users,
  Weight,
  ChevronLeft,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { fetchGameBySlug } from '../../api/games';
import { fetchMeetups } from '../../api/meetups';
import { GameCollectionActions } from '../../components/game-collection-actions';
import { Button } from '../../components/ui';
import { gameBannerGradient } from '../../lib/game-banner-gradient';
import { queryKeys } from '../../lib/query-keys';
import modalStyles from '../../components/ui/modal.module.scss';
import { GameDetailEventsPanel } from './components/game-detail-events-panel/game-detail-events-panel';
import { GameDetailReviewsPanel } from './components/game-detail-reviews-panel/game-detail-reviews-panel';
import styles from './game-detail-page.module.scss';

const routeApi = getRouteApi('/games/$slug');
const MAX_STARS = 5;
type DetailTab = 'overview' | 'reviews' | 'events';

function toFiveStarAverage(score: number | null): number | null {
  if (score == null) {
    return null;
  }
  return Math.min(MAX_STARS, Math.max(0, score));
}

function formatPlayers(game: GameDetail): string | null {
  if (game.minPlayers == null && game.maxPlayers == null) {
    return null;
  }
  return `${game.minPlayers ?? '?'}–${game.maxPlayers ?? '?'}`;
}

function formatPlayTime(game: GameDetail): string | null {
  if (game.playTimeMin == null && game.playTimeMax == null) {
    return null;
  }
  if (game.playTimeMin != null && game.playTimeMax != null) {
    return `${game.playTimeMin}–${game.playTimeMax} min`;
  }
  if (game.playTimeMax != null) {
    return `${game.playTimeMax} min`;
  }
  return `${game.playTimeMin}+ min`;
}

function leadDescription(description: string | null): string {
  if (!description?.trim()) {
    return 'Discover players, reviews, and meetups for this title.';
  }
  const first = description.trim().split(/\n+/)[0] ?? '';
  if (first.length <= 180) {
    return first;
  }
  return `${first.slice(0, 177).trimEnd()}…`;
}

export function GameDetailPage() {
  const { slug } = routeApi.useParams();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);

  const gameQuery = useQuery({
    queryKey: queryKeys.games.detail(slug),
    queryFn: () => fetchGameBySlug(slug),
  });

  const eventsQuery = useQuery({
    queryKey: queryKeys.meetups.list({
      page: 1,
      upcoming: 'true',
      gameId: gameQuery.data?.id ?? '',
      visibility: 'ALL',
      q: '',
      joined: '',
    }),
    queryFn: () =>
      fetchMeetups({
        page: 1,
        limit: 20,
        upcoming: 'true',
        gameId: gameQuery.data!.id,
      }),
    enabled: Boolean(gameQuery.data?.id),
  });

  const bannerStyle = useMemo(
    () => ({ background: gameBannerGradient(slug) }),
    [slug],
  );

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
          <Link to="/games" className="text-link">
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
  const averageStars = toFiveStarAverage(game.averageRating);
  const players = formatPlayers(game);
  const playTime = formatPlayTime(game);
  const eventCount = eventsQuery.data?.data.length ?? 0;

  return (
    <>
      <article className={`page ${styles.root}`}>
        <header className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <Link to="/games" className={styles.backBtn} aria-label="Back to catalog">
              <ChevronLeft size={18} aria-hidden />
            </Link>
            <span className={styles.headerRule} aria-hidden />
            <span className={styles.headerKicker}>Game Details</span>
          </div>
          <button type="button" className={styles.backBtn} aria-label="Share game">
            <Share2 size={16} aria-hidden />
          </button>
        </header>

        <div className={styles.headerSpacer} aria-hidden />

        <div className={styles.scrollBody}>
          <section className={styles.hero}>
            <div className={styles.heroBanner} style={bannerStyle}>
              <div className={styles.heroOverlay} aria-hidden />
            </div>
            <div className={styles.heroContent}>
              <div className={styles.coverWrap}>
                {game.imageUrl ? (
                  <img src={game.imageUrl} alt="" className={styles.coverImg} />
                ) : (
                  <div className={styles.coverPlaceholder} aria-hidden />
                )}
                {averageStars != null && (
                  <span className={styles.ratingBadge}>
                    <Star size={12} aria-hidden fill="currentColor" />
                    {averageStars.toFixed(1)}
                  </span>
                )}
              </div>
              <div className={styles.heroMain}>
                <div className={styles.tagRow}>
                  {game.genres.map((genre) => (
                    <span key={genre.id} className={styles.tag}>
                      {genre.name}
                    </span>
                  ))}
                  {players && <span className={styles.tag}>{players} Players</span>}
                  {playTime && <span className={styles.tag}>{playTime}</span>}
                </div>
                <h1 className={styles.title}>{game.title}</h1>
                <p className={styles.lead}>{leadDescription(game.description)}</p>
                <GameCollectionActions slug={game.slug} appearance="hero" />
              </div>
            </div>
          </section>

          <section className={styles.tabsSection}>
            <div role="tablist" aria-label="Game detail sections" className={styles.tabList}>
              {(
                [
                  ['overview', 'Overview'],
                  ['reviews', 'Reviews'],
                  ['events', 'Events'],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={
                    activeTab === tab
                      ? `${styles.tabBtn} ${styles.tabBtnActive}`
                      : styles.tabBtn
                  }
                  onClick={() => setActiveTab(tab)}
                >
                  {label}
                  {tab === 'events' && eventCount > 0 && (
                    <span className={styles.tabCount}>{eventCount}</span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div role="tabpanel" className={styles.overviewGrid}>
                <section className={styles.glassPanel}>
                  <h2 className={styles.panelTitle}>About the Game</h2>
                  {game.description ? (
                    <div className={styles.aboutText}>
                      {game.description.split('\n').map((para, index) => (
                        <p key={index}>{para}</p>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.aboutText}>No description available yet.</p>
                  )}
                </section>

                <aside className={styles.glassPanel}>
                  <h3 className={styles.panelTitleMuted}>Game Stats</h3>
                  <dl className={styles.statList}>
                    {players && (
                      <div className={styles.statRow}>
                        <dt className={styles.statLabel}>
                          <Users size={16} aria-hidden /> Players
                        </dt>
                        <dd className={styles.statValue}>{players}</dd>
                      </div>
                    )}
                    {playTime && (
                      <div className={styles.statRow}>
                        <dt className={styles.statLabel}>
                          <Clock size={16} aria-hidden /> Playtime
                        </dt>
                        <dd className={styles.statValue}>{playTime}</dd>
                      </div>
                    )}
                    {game.yearPublished != null && (
                      <div className={styles.statRow}>
                        <dt className={styles.statLabel}>Year</dt>
                        <dd className={styles.statValue}>{game.yearPublished}</dd>
                      </div>
                    )}
                    {game.complexity != null && (
                      <div className={styles.statRow}>
                        <dt className={styles.statLabel}>
                          <Weight size={16} aria-hidden /> Weight
                        </dt>
                        <dd className={styles.statValueAccent}>
                          {game.complexity.toFixed(2)} / 5
                        </dd>
                      </div>
                    )}
                    {averageStars != null && (
                      <div className={styles.statRow}>
                        <dt className={styles.statLabel}>
                          <Star size={16} aria-hidden /> Rating
                        </dt>
                        <dd className={styles.statValueAccent}>
                          {averageStars.toFixed(1)} / {MAX_STARS}
                        </dd>
                      </div>
                    )}
                  </dl>
                </aside>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div role="tabpanel">
                <GameDetailReviewsPanel
                  slug={slug}
                  game={game}
                  onExpandImage={setExpandedImageUrl}
                />
              </div>
            )}

            {activeTab === 'events' && (
              <div role="tabpanel">
                <GameDetailEventsPanel gameId={game.id} />
              </div>
            )}
          </section>
        </div>
      </article>

      {expandedImageUrl && (
        <div
          className={modalStyles.backdrop}
          role="dialog"
          aria-modal="true"
          onClick={() => setExpandedImageUrl(null)}
        >
          <div
            className={`${modalStyles.panel} ${styles.reviewImageModal}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={modalStyles.header}>
              <h2 className={modalStyles.title}>Review image</h2>
              <Button
                type="button"
                variant="icon"
                className={modalStyles.close}
                onClick={() => setExpandedImageUrl(null)}
                aria-label="Close"
              >
                ×
              </Button>
            </div>
            <img src={expandedImageUrl} alt="" className="review-image-expanded" />
          </div>
        </div>
      )}
    </>
  );
}