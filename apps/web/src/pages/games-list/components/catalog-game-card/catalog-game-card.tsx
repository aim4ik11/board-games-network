import { Link } from '@tanstack/react-router';
import {
  Brain,
  Check,
  Clock,
  Plus,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { CollectionStatus } from '@boardgame/shared';
import { requestAuthModal } from '../../../../lib/auth-modal-intent';
import {
  formatPlaytime,
  formatPlayerRange,
  primaryGenreDisplay,
  type EnrichedGame,
} from '../../../../lib/catalog-enrichment';
import styles from './catalog-game-card.module.scss';

function StatusBadge({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className: string;
}) {
  return (
    <span className={className}>
      <Icon size={14} aria-hidden />
      {label}
    </span>
  );
}

export function CatalogGameCard({
  game,
  status,
  listView,
  addMenuOpen,
  addPending,
  isAuthenticated,
  onToggleAddMenu,
  onAddToCollection,
}: {
  game: EnrichedGame;
  status: CollectionStatus | undefined;
  listView: boolean;
  addMenuOpen: boolean;
  addPending: boolean;
  isAuthenticated: boolean;
  onToggleAddMenu: (slug: string) => void;
  onAddToCollection: (slug: string, status: CollectionStatus) => void;
}) {
  const playtime = formatPlaytime(
    game.playTimeMin,
    game.playTimeMax ?? game.playTimeMin,
  );
  const players = formatPlayerRange(game.minPlayers, game.maxPlayers);

  return (
    <article
      className={`${styles.card} ${listView ? styles.cardListLayout : ''} ${addMenuOpen ? styles.cardMenuOpen : ''}`}
    >
      <Link
        to="/games/$slug"
        params={{ slug: game.slug }}
        className={styles.cardMedia}
      >
        {game.imageUrl ? (
          <img src={game.imageUrl} alt="" className={styles.cardImg} />
        ) : (
          <div className={styles.cardImg} aria-hidden />
        )}
        <div className={styles.ratingBadge} title="Mock score">
          {game.displayRating.toFixed(1)}
        </div>
        <div className={styles.genreChip}>
          <span className={styles.genreChipInner}>
            {primaryGenreDisplay(game)}
          </span>
        </div>
      </Link>
      <div className={styles.cardBody}>
        <Link
          to="/games/$slug"
          params={{ slug: game.slug }}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <h2 className={styles.cardTitle}>{game.title}</h2>
        </Link>
        {game.description ? (
          <p className={styles.cardDescription}>{game.description}</p>
        ) : null}
        <div className={styles.metaRow}>
          <span className={styles.metaItem} title="Players">
            <Users size={14} aria-hidden />
            {players}
          </span>
          <span className={styles.metaItem} title="Playtime">
            <Clock size={14} aria-hidden />
            {playtime}
          </span>
          <span
            className={styles.metaItem}
            title={
              game.complexity != null
                ? 'Complexity (weight)'
                : 'Complexity (estimated)'
            }
          >
            <Brain size={14} aria-hidden />
            {game.weight.toFixed(2)}
          </span>
        </div>
        <div className={styles.cardFooter}>
          {status === 'OWNED' ? (
            <StatusBadge
              icon={Check}
              label="Owned"
              className={styles.statusOwned}
            />
          ) : status === 'WISHLIST' ? (
            <StatusBadge
              icon={Star}
              label="Wishlist"
              className={styles.statusWishlist}
            />
          ) : !isAuthenticated ? (
            <button
              type="button"
              className={styles.addBtn}
              aria-label={`Sign in to add ${game.title}`}
              onClick={() => requestAuthModal('login')}
            >
              <Plus size={18} aria-hidden />
            </button>
          ) : (
            <div className={styles.addMenuWrap} id={`catalog-add-${game.slug}`}>
              <button
                type="button"
                className={`${styles.addBtn} ${addMenuOpen ? styles.addMenuOpen : ''}`}
                aria-expanded={addMenuOpen}
                aria-haspopup="menu"
                disabled={addPending}
                aria-label={`Add ${game.title} to collection`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleAddMenu(game.slug);
                }}
              >
                <Plus size={18} aria-hidden />
              </button>
              {addMenuOpen && (
                <div className={styles.addMenuPanel} role="menu">
                  <button
                    type="button"
                    className={styles.addMenuItem}
                    role="menuitem"
                    disabled={addPending}
                    onClick={() => onAddToCollection(game.slug, 'WISHLIST')}
                  >
                    <Star size={16} aria-hidden />
                    Add to wishlist
                  </button>
                  <button
                    type="button"
                    className={styles.addMenuItem}
                    role="menuitem"
                    disabled={addPending}
                    onClick={() => onAddToCollection(game.slug, 'OWNED')}
                  >
                    <Check size={16} aria-hidden />
                    Mark as owned
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
