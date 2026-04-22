import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchGameBySlug } from "../api/games";
import { queryKeys } from "../lib/query-keys";

type MeetupGamePreviewProps = {
  game: {
    slug: string;
    title: string;
  };
};

export function MeetupGamePreview({ game }: MeetupGamePreviewProps) {
  const detailQuery = useQuery({
    queryKey: queryKeys.games.detail(game.slug),
    queryFn: () => fetchGameBySlug(game.slug),
  });

  const imageUrl = detailQuery.data?.imageUrl ?? null;

  return (
    <Link to="/games/$slug" params={{ slug: game.slug }} className="meetup-game-preview">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={game.title}
          className="meetup-game-preview-image"
          loading="lazy"
        />
      ) : (
        <div className="meetup-game-preview-image meetup-game-preview-image-placeholder" />
      )}
      <div className="meetup-game-preview-body">
        <span className="meetup-game-preview-label">Game</span>
        <span className="meetup-game-preview-title">{game.title}</span>
      </div>
    </Link>
  );
}
