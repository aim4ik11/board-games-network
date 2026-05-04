import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { PublicProfileSummary } from '../api/types';

type Props = {
  summary: PublicProfileSummary;
  headerAction?: ReactNode;
};

const COLLECTION_SECTIONS = [
  { key: 'owned', label: 'Owned' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'previouslyOwned', label: 'Previously owned' },
] as const;

export function PublicProfileOverview({ summary, headerAction }: Props) {
  const { user, stats, collectionPreview } = summary;

  return (
    <div className="profile-main">
      <section className="profile-panel profile-public-hero">
        <div className="profile-public-head">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="profile-avatar" />
          ) : (
            <div className="profile-avatar placeholder" aria-hidden />
          )}
          <div className="profile-public-meta">
            <h1>{user.displayName}</h1>
            {user.city && <p className="muted">{user.city}</p>}
            {user.bio && <p className="profile-bio">{user.bio}</p>}
          </div>
          {headerAction && (
            <div className="profile-public-action">{headerAction}</div>
          )}
        </div>
      </section>

      <section
        className="profile-panel profile-stats-grid"
        aria-label="Profile stats"
      >
        <article className="profile-stat">
          <span className="profile-stat-label">Collection</span>
          <strong className="profile-stat-value">
            {stats.collectionTotal}
          </strong>
          <span className="muted">games tracked</span>
        </article>
        <article className="profile-stat">
          <span className="profile-stat-label">Friends</span>
          <strong className="profile-stat-value">{stats.friendsCount}</strong>
          <span className="muted">connections</span>
        </article>
        <article className="profile-stat">
          <span className="profile-stat-label">Ratings</span>
          <strong className="profile-stat-value">{stats.ratingsCount}</strong>
          <span className="muted">submitted scores</span>
        </article>
        <article className="profile-stat">
          <span className="profile-stat-label">Reviews</span>
          <strong className="profile-stat-value">{stats.reviewsCount}</strong>
          <span className="muted">written notes</span>
        </article>
      </section>

      <section
        className="profile-panel"
        aria-labelledby="profile-collection-title"
      >
        <h2 id="profile-collection-title" className="h-aside">
          Collection snapshot
        </h2>
        <div className="profile-collection-grid">
          {COLLECTION_SECTIONS.map((section) => {
            const items = collectionPreview[section.key];
            return (
              <article key={section.key} className="profile-mini-card">
                <h3>{section.label}</h3>
                <p className="profile-mini-count">{items.length}</p>
                {items.length > 0 ? (
                  <ul className="profile-mini-list">
                    {items.slice(0, 4).map((game) => (
                      <li key={game.id}>
                        <Link
                          to="/games/$slug"
                          params={{ slug: game.slug }}
                          className="text-link"
                        >
                          {game.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No games yet.</p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
