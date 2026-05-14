import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CollectionStatus } from '@boardgame/shared';
import {
  Archive,
  Bookmark,
  Check,
  ChevronDown,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import {
  addToCollection,
  fetchCollectionEntry,
  removeFromCollection,
} from '../api/collection';
import { requestAuthModal } from '../lib/auth-modal-intent';
import { queryKeys } from '../lib/query-keys';
import { useAuth } from '../lib/use-auth';
import styles from './game-collection-actions.module.scss';

const STATUS_OPTIONS: {
  status: CollectionStatus;
  label: string;
  description: string;
  icon: typeof Check;
}[] = [
  {
    status: 'WISHLIST',
    label: 'Wishlist',
    description: 'Save for later',
    icon: Bookmark,
  },
  {
    status: 'OWNED',
    label: 'Owned',
    description: 'In your collection',
    icon: Check,
  },
  {
    status: 'PREVIOUSLY_OWNED',
    label: 'Previously owned',
    description: 'Played before',
    icon: Archive,
  },
];

function statusOption(status: CollectionStatus) {
  return STATUS_OPTIONS.find((option) => option.status === status);
}

function invalidateCollection(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.collection.all });
}

function CollectionStatusMenu({
  entryStatus,
  pending,
  appearance,
  onSelectStatus,
  onRemove,
}: {
  entryStatus: CollectionStatus | null;
  pending: boolean;
  appearance: 'default' | 'hero';
  onSelectStatus: (status: CollectionStatus) => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  const activeOption = entryStatus ? statusOption(entryStatus) : null;
  const ActiveIcon = activeOption?.icon;

  const triggerClass =
    appearance === 'hero'
      ? entryStatus
        ? `${styles.heroTrigger} ${styles.heroTriggerActive} ${styles[`heroTrigger_${entryStatus}`]}`
        : styles.heroTrigger
      : entryStatus
        ? `${styles.defaultTrigger} ${styles[`defaultTrigger_${entryStatus}`]}`
        : `${styles.defaultTrigger} ${styles.defaultTriggerAdd}`;

  return (
    <div
      ref={wrapRef}
      className={
        appearance === 'hero' ? styles.heroMenuWrap : styles.defaultMenuWrap
      }
    >
      <button
        type="button"
        className={triggerClass}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        disabled={pending}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className={styles.triggerIconSlot} aria-hidden>
          {activeOption && ActiveIcon ? (
            <span
              className={`${styles.triggerLeadIcon} ${styles[`triggerLeadIcon_${activeOption.status}`]}`}
            >
              <ActiveIcon size={16} />
            </span>
          ) : (
            <Plus
              size={appearance === 'hero' ? 18 : 16}
              className={styles.triggerAddIcon}
            />
          )}
        </span>
        <span className={styles.triggerLabel}>
          {activeOption ? activeOption.label : 'Add to collection'}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={menuOpen ? styles.chevronOpen : styles.chevron}
        />
      </button>

      {menuOpen && (
        <div
          id={menuId}
          className={styles.menuPanel}
          role="menu"
          aria-label="Collection status"
        >
          {STATUS_OPTIONS.map(({ status, label, description, icon: Icon }) => {
            const isActive = entryStatus === status;
            return (
              <button
                key={status}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={
                  isActive ? `${styles.menuItem} ${styles.menuItemActive}` : styles.menuItem
                }
                disabled={pending}
                onClick={() => {
                  onSelectStatus(status);
                  setMenuOpen(false);
                }}
              >
                <span className={styles.menuItemIcon} aria-hidden>
                  <Icon size={16} />
                </span>
                <span className={styles.menuItemText}>
                  <span className={styles.menuItemLabel}>{label}</span>
                  <span className={styles.menuItemDesc}>{description}</span>
                </span>
                {isActive && <Check size={14} className={styles.menuItemCheck} aria-hidden />}
              </button>
            );
          })}

          {entryStatus && (
            <>
              <div className={styles.menuDivider} role="separator" />
              <button
                type="button"
                role="menuitem"
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                disabled={pending}
                onClick={() => {
                  onRemove();
                  setMenuOpen(false);
                }}
              >
                <span className={styles.menuItemIcon} aria-hidden>
                  <Trash2 size={16} />
                </span>
                <span className={styles.menuItemText}>
                  <span className={styles.menuItemLabel}>Remove from collection</span>
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function GameCollectionActions({
  slug,
  appearance = 'default',
}: {
  slug: string;
  appearance?: 'default' | 'hero';
}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const entryQuery = useQuery({
    queryKey: queryKeys.collection.entry(slug),
    queryFn: () => fetchCollectionEntry(slug),
    enabled: Boolean(token),
  });

  const addOrUpdate = useMutation({
    mutationFn: (status: CollectionStatus) => addToCollection({ slug, status }),
    onSuccess: () => invalidateCollection(queryClient),
  });

  const remove = useMutation({
    mutationFn: () => removeFromCollection(slug),
    onSuccess: () => invalidateCollection(queryClient),
  });

  if (!token) {
    if (appearance === 'hero') {
      return (
        <p className={styles.signInText}>
          <button
            type="button"
            className="link-button text-link"
            onClick={() => requestAuthModal('login')}
          >
            Sign in
          </button>{' '}
          to add this game to your collection.
        </p>
      );
    }

    return (
      <p className="muted">
        <button
          type="button"
          className="link-button text-link"
          onClick={() => requestAuthModal('login')}
        >
          Sign in
        </button>{' '}
        to add this game to your collection.
      </p>
    );
  }

  if (entryQuery.isLoading) {
    return <p className="muted">Loading your collection…</p>;
  }

  if (entryQuery.isError) {
    return (
      <p className="error" role="alert">
        Could not load collection status.
      </p>
    );
  }

  const entry = entryQuery.data;
  const pending = addOrUpdate.isPending || remove.isPending;

  return (
    <CollectionStatusMenu
      entryStatus={entry?.status ?? null}
      pending={pending}
      appearance={appearance}
      onSelectStatus={(status) => addOrUpdate.mutate(status)}
      onRemove={() => remove.mutate()}
    />
  );
}
