import { Link } from '@tanstack/react-router';
import { gamesListSearchDefault } from '../lib/games-route-defaults';

export function HomePage() {
  return (
    <section className="page">
      <h1>Board game social</h1>
      <p className="lede">
        Browse the catalog, sign in to rate and review games, and (soon) organize meetups with
        friends.
      </p>
      <p>
        <Link to="/games" search={gamesListSearchDefault} className="text-link">
          Open the catalog →
        </Link>
      </p>
    </section>
  );
}
