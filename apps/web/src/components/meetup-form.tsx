import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchMyCollection } from "../api/collection";
import { fetchGamesList } from "../api/games";
import type { PlaySessionVisibility } from "../api/meetups";
import type { GameListItem } from "../api/types";
import { gamesListSearchDefault } from "../lib/games-route-defaults";
import { queryKeys } from "../lib/query-keys";
import { Button } from "./ui";

const RECENT_MEETUP_GAMES_STORAGE_KEY = "boardgame:recent-meetup-games";
const RECENT_MEETUP_GAMES_LIMIT = 8;

const VISIBILITY_OPTIONS: Array<{
  value: PlaySessionVisibility;
  label: string;
  hint: string;
}> = [
  {
    value: "PUBLIC",
    label: "Public",
    hint: "Anyone can discover and join this meetup.",
  },
  {
    value: "FRIENDS",
    label: "Friends only",
    hint: "Only your accepted friends can access and join.",
  },
  {
    value: "INVITE_ONLY",
    label: "Invite only",
    hint: "Only invited players can view and join.",
  },
];

export type MeetupFormSubmitPayload = {
  title: string;
  scheduledAt: string;
  gameId?: string;
  location?: string;
  maxPlayers?: number;
  description?: string;
  visibility?: PlaySessionVisibility;
};

type MeetupFormInitialValues = {
  title?: string;
  scheduledAtLocal?: string;
  game?: { id: string; title: string } | null;
  location?: string;
  maxPlayers?: number | null;
  description?: string;
  visibility?: PlaySessionVisibility;
};

type MeetupFormProps = {
  initialValues: MeetupFormInitialValues;
  onSubmit: (payload: MeetupFormSubmitPayload) => void;
  isSubmitting: boolean;
  submitLabel: string;
  maxPlayersLimit?: number;
  formKey?: string;
};

function dedupeGames(games: GameListItem[]): GameListItem[] {
  const seen = new Set<string>();
  const result: GameListItem[] = [];
  for (const game of games) {
    if (!seen.has(game.id)) {
      seen.add(game.id);
      result.push(game);
    }
  }
  return result;
}

function readRecentMeetupGames(): GameListItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(RECENT_MEETUP_GAMES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry): entry is GameListItem => {
        return (
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as { id?: unknown }).id === "string" &&
          typeof (entry as { title?: unknown }).title === "string" &&
          typeof (entry as { slug?: unknown }).slug === "string"
        );
      })
      .slice(0, RECENT_MEETUP_GAMES_LIMIT);
  } catch {
    return [];
  }
}

function storeRecentMeetupGame(game: GameListItem): void {
  if (typeof window === "undefined") {
    return;
  }
  const existing = readRecentMeetupGames();
  const next = dedupeGames([game, ...existing]).slice(0, RECENT_MEETUP_GAMES_LIMIT);
  window.localStorage.setItem(RECENT_MEETUP_GAMES_STORAGE_KEY, JSON.stringify(next));
}

export function MeetupForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  maxPlayersLimit = 20,
  formKey,
}: MeetupFormProps) {
  const [gameSearch, setGameSearch] = useState(initialValues.game?.title ?? "");
  const [isGamePickerOpen, setIsGamePickerOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameListItem | null>(
    initialValues.game
      ? {
          id: initialValues.game.id,
          title: initialValues.game.title,
          slug: "",
          imageUrl: null,
          yearPublished: null,
          minPlayers: null,
          maxPlayers: null,
          playTimeMin: null,
        }
      : null,
  );
  const [recentGames, setRecentGames] = useState<GameListItem[]>([]);
  const [visibility, setVisibility] = useState<PlaySessionVisibility>(
    initialValues.visibility ?? "PUBLIC",
  );
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRecentGames(readRecentMeetupGames());
  }, []);

  useEffect(() => {
    setGameSearch(initialValues.game?.title ?? "");
    setSelectedGame(
      initialValues.game
        ? {
            id: initialValues.game.id,
            title: initialValues.game.title,
            slug: "",
            imageUrl: null,
            yearPublished: null,
            minPlayers: null,
            maxPlayers: null,
            playTimeMin: null,
          }
        : null,
    );
    setVisibility(initialValues.visibility ?? "PUBLIC");
  }, [initialValues.game, initialValues.visibility, formKey]);

  useEffect(() => {
    if (!isGamePickerOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsGamePickerOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsGamePickerOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isGamePickerOpen]);

  const collectionQuery = useQuery({
    queryKey: queryKeys.collection.all,
    queryFn: () => fetchMyCollection(),
  });

  const gamesQuery = useQuery({
    queryKey: queryKeys.games.list({ q: gameSearch, page: 1 }),
    queryFn: () => fetchGamesList({ q: gameSearch, page: 1, limit: 20 }),
    enabled: gameSearch.trim().length >= 2,
  });

  const topGames = useMemo(() => {
    const collectionGames = (collectionQuery.data ?? []).map((entry) => entry.game);
    return dedupeGames([...collectionGames, ...recentGames]).slice(0, 12);
  }, [collectionQuery.data, recentGames]);

  const searchResults = useMemo(() => {
    const results = gamesQuery.data?.data ?? [];
    if (!selectedGame) {
      return results;
    }
    return results.filter((game) => game.id !== selectedGame.id);
  }, [gamesQuery.data?.data, selectedGame]);

  const selectGame = (game: GameListItem) => {
    setSelectedGame(game);
    setGameSearch(game.title);
    setIsGamePickerOpen(false);
  };

  return (
    <form
      key={formKey}
      className="stack-form meetup-create-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const gameId = String(fd.get("gameId") ?? "");
        const mp = fd.get("maxPlayers");
        const nextVisibility = String(fd.get("visibility") ?? "PUBLIC");
        onSubmit({
          title: String(fd.get("title") ?? "").trim(),
          scheduledAt: new Date(String(fd.get("scheduledAt") ?? "")).toISOString(),
          ...(gameId ? { gameId } : {}),
          location: String(fd.get("location") ?? "").trim() || undefined,
          ...(mp !== "" && mp != null ? { maxPlayers: Number(mp) } : {}),
          description: String(fd.get("description") ?? "").trim() || undefined,
          ...(nextVisibility === "PUBLIC" ||
          nextVisibility === "FRIENDS" ||
          nextVisibility === "INVITE_ONLY"
            ? { visibility: nextVisibility }
            : {}),
        });
        if (selectedGame) {
          storeRecentMeetupGame(selectedGame);
        }
      }}
    >
      <div className="meetup-create-grid">
        <label className="field">
          <span>Title</span>
          <input
            name="title"
            required
            className="input"
            maxLength={200}
            defaultValue={initialValues.title ?? ""}
          />
        </label>
        <label className="field">
          <span>When</span>
          <input
            name="scheduledAt"
            type="datetime-local"
            required
            className="input"
            defaultValue={initialValues.scheduledAtLocal ?? ""}
          />
        </label>
        <label className="field">
          <span>Location</span>
          <input
            name="location"
            className="input"
            maxLength={500}
            defaultValue={initialValues.location ?? ""}
          />
        </label>
        <label className="field">
          <span>Max players (includes you)</span>
          <input
            name="maxPlayers"
            type="number"
            min={2}
            max={maxPlayersLimit}
            className="input"
            placeholder="e.g. 4"
            defaultValue={initialValues.maxPlayers ?? ""}
          />
        </label>
        <label className="field">
          <span>Visibility</span>
          <select
            name="visibility"
            className="input"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as PlaySessionVisibility)}
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="field-hint">
            {VISIBILITY_OPTIONS.find((option) => option.value === visibility)?.hint}
          </span>
        </label>
        <div className="field">
          <span>Game (optional)</span>
          <div className="meetup-game-picker" ref={pickerRef}>
            <input
              type="hidden"
              name="gameId"
              value={selectedGame?.id ?? ""}
              readOnly
            />
            <input
              className="input meetup-game-input"
              value={gameSearch}
              placeholder="Search games by title (min 2 letters)"
              onChange={(e) => {
                setGameSearch(e.target.value);
                setIsGamePickerOpen(true);
                if (e.target.value.trim().length === 0) {
                  setSelectedGame(null);
                }
              }}
              onFocus={() => setIsGamePickerOpen(true)}
            />
            {selectedGame && (
              <Button
                type="button"
                className="meetup-game-clear-icon"
                onClick={() => {
                  setSelectedGame(null);
                  setGameSearch("");
                  setIsGamePickerOpen(false);
                }}
                aria-label="Clear selected game"
              >
                ×
              </Button>
            )}
            {isGamePickerOpen && (
              <div className="meetup-game-dropdown">
                {topGames.length > 0 && (
                  <>
                    <p className="meetup-game-section-title">
                      Your collection & recent
                    </p>
                    <div className="meetup-game-options">
                      {topGames.map((game) => (
                        <button
                          key={game.id}
                          type="button"
                          className="meetup-game-option"
                          onClick={() => selectGame(game)}
                        >
                          <span className="meetup-game-title">{game.title}</span>
                          {game.yearPublished != null && (
                            <span className="muted">{game.yearPublished}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="meetup-game-section-title">Search results</p>
                {gamesQuery.isFetching && <p className="muted">Searching…</p>}
                {!gamesQuery.isFetching && gameSearch.trim().length < 2 && (
                  <p className="muted">
                    Type at least 2 characters to search the full catalog.
                  </p>
                )}
                {!gamesQuery.isFetching &&
                  gameSearch.trim().length >= 2 &&
                  searchResults.length === 0 && (
                    <p className="muted">No games found.</p>
                  )}
                {searchResults.length > 0 && (
                  <div className="meetup-game-options">
                    {searchResults.map((game) => (
                      <button
                        key={game.id}
                        type="button"
                        className="meetup-game-option"
                        onClick={() => selectGame(game)}
                      >
                        <span className="meetup-game-title">{game.title}</span>
                        {game.yearPublished != null && (
                          <span className="muted">{game.yearPublished}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="muted">
            <Link to="/games" search={gamesListSearchDefault} className="text-link">
              Browse catalog
            </Link>{" "}
            if the game is missing from the list.
          </p>
        </div>
        <label className="field meetup-create-full">
          <span>Description</span>
          <textarea
            name="description"
            rows={4}
            className="input textarea"
            maxLength={4000}
            defaultValue={initialValues.description ?? ""}
          />
        </label>
      </div>
      <div className="button-row">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
