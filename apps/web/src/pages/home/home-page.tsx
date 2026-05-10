import { Link } from '@tanstack/react-router';
import { gamesListSearchDefault } from '../../lib/games-route-defaults';
import styles from './home-page.module.scss';

export function HomePage() {
  return (
    <section className={`page ${styles.root}`}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Play together on <span className={styles.heroAccent}>Game Hub</span>
        </h1>
        <p className={styles.lede}>
          Browse the catalog, build your collection, meet players, and organize
          board game nights — one place for your tabletop social life.
        </p>
        <div className={styles.actions}>
          <Link
            to="/games"
            search={gamesListSearchDefault}
            className={styles.primaryCta}
          >
            Open catalog
          </Link>
          <a href="#features" className={styles.secondaryCta}>
            See features
          </a>
        </div>
      </div>
      <div id="features" className={styles.grid}>
        <div className={styles.feature}>
          <h2>Collection</h2>
          <p>Track owned, wishlist, and played games with quick access.</p>
        </div>
        <div className={styles.feature}>
          <h2>Meetups</h2>
          <p>Plan sessions, invite friends, and keep chats in sync.</p>
        </div>
        <div className={styles.feature}>
          <h2>Community</h2>
          <p>Discover players, chat, and share reviews on your favorite titles.</p>
        </div>
      </div>
    </section>
  );
}
