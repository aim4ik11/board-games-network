import { Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import styles from './catalog-search-shell.module.scss';

export function CatalogSearchShell({
  searchQ,
  onSubmit,
  children,
}: {
  searchQ: string;
  onSubmit: (q: string) => void;
  children: (slots: {
    desktopForm: ReactNode;
    mobileForm: ReactNode;
  }) => ReactNode;
}) {
  const [draft, setDraft] = useState(searchQ);

  const desktopForm = (
    <form
      className={styles.searchWrap}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(draft.trim());
      }}
    >
      <Search className={styles.searchIcon} size={18} aria-hidden />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className={styles.searchInput}
        placeholder="Search entire catalog…"
        aria-label="Search catalog"
      />
    </form>
  );

  const mobileForm = (
    <form
      className={styles.mobileSearch}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(draft.trim());
      }}
    >
      <div
        className={styles.searchWrap}
        style={{ display: 'block', maxWidth: 'none' }}
      >
        <Search className={styles.searchIcon} size={18} aria-hidden />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={styles.searchInput}
          placeholder="Search catalog…"
          aria-label="Search catalog"
        />
      </div>
    </form>
  );

  return <>{children({ desktopForm, mobileForm })}</>;
}
