import { useCallback, useSyncExternalStore } from 'react';
import { getTheme, setTheme, type ThemeId } from '../../lib/theme';
import styles from './settings-page.module.scss';

function subscribeTheme(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === 'boardgame-theme' || event.key === null) {
      callback();
    }
  };
  window.addEventListener('storage', onStorage);
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => {
    window.removeEventListener('storage', onStorage);
    observer.disconnect();
  };
}

function readThemeSnapshot(): ThemeId {
  return getTheme();
}

export function SettingsPage() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readThemeSnapshot,
    readThemeSnapshot,
  );

  const onPick = useCallback((next: ThemeId) => {
    setTheme(next);
  }, []);

  return (
    <section className={`page ${styles.root}`}>
      <header className={styles.pageHead}>
        <h1>Settings</h1>
        <p className="muted">
          Account preferences and appearance. More sections can tie into API
          settings later.
        </p>
      </header>

      <div className={styles.sections}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon} aria-hidden>
              ◎
            </span>
            Appearance
          </h2>
          <p className={`muted ${styles.cardDesc}`}>
            Theme tokens are centralized; switching here updates{' '}
            <code className={styles.code}>data-theme</code> on the document for
            future light/dark polish.
          </p>
          <div className={styles.themeRow} role="group" aria-label="Theme">
            <button
              type="button"
              className={
                theme === 'dark' ? styles.themeBtnActive : styles.themeBtn
              }
              onClick={() => onPick('dark')}
            >
              Dark (Game Hub)
            </button>
            <button
              type="button"
              className={
                theme === 'light' ? styles.themeBtnActive : styles.themeBtn
              }
              onClick={() => onPick('light')}
            >
              Light
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon} aria-hidden>
              ✉
            </span>
            Notifications
          </h2>
          <p className={`muted ${styles.cardDesc}`}>
            Placeholder — wire to notification preferences when the API exposes
            them.
          </p>
        </section>
      </div>
    </section>
  );
}
