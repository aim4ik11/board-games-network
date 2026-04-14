import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchMyCollection } from "../api/collection";
import { fetchFriendsList } from "../api/friends";
import { fetchGamesList } from "../api/games";
import {
  createMeetup,
  createMeetupInvitation,
  type PlaySessionVisibility,
} from "../api/meetups";
import type { FriendConnection, GameListItem } from "../api/types";
import {
  MultiSelectPicker,
  type MultiSelectOption,
} from "../components/multi-select-picker";
import { toDatetimeLocalValue } from "../lib/datetime-local";
import { gamesListSearchDefault } from "../lib/games-route-defaults";
import { queryKeys } from "../lib/query-keys";

const RECENT_MEETUP_GAMES_STORAGE_KEY = "boardgame:recent-meetup-games";
const RECENT_MEETUP_GAMES_LIMIT = 8;

const defaultWhen = () => {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return toDatetimeLocalValue(d.toISOString());
};

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

export function MeetupNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [gameSearch, setGameSearch] = useState("");
  const [isGamePickerOpen, setIsGamePickerOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameListItem | null>(null);
  const [recentGames, setRecentGames] = useState<GameListItem[]>([]);
  const [visibility, setVisibility] = useState<PlaySessionVisibility>("PUBLIC");
  const [selectedInviteeIds, setSelectedInviteeIds] = useState<string[]>([]);
  const [inviteWarning, setInviteWarning] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRecentGames(readRecentMeetupGames());
  }, []);

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

  const friendsQuery = useQuery({
    queryKey: queryKeys.friends.list(),
    queryFn: fetchFriendsList,
  });

  const create = useMutation({
    mutationFn: createMeetup,
    onSuccess: async (data) => {
      setInviteWarning(null);
      if (visibility === "INVITE_ONLY" && selectedInviteeIds.length > 0) {
        const inviteResults = await Promise.allSettled(
          selectedInviteeIds.map((userId) => createMeetupInvitation(data.id, userId)),
        );
        const failed = inviteResults.filter(
          (result) => result.status === "rejected",
        ).length;
        if (failed > 0) {
          setInviteWarning(
            `Meetup created, but ${failed} invite${failed > 1 ? "s" : ""} failed to send.`,
          );
        }
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetups.all });
      void navigate({
        to: "/meetups/$meetupId",
        params: { meetupId: data.id },
      });
    },
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

  const friendOptions = useMemo<MultiSelectOption[]>(() => {
    return (friendsQuery.data ?? []).map((friend: FriendConnection) => ({
      id: friend.user.id,
      label: friend.user.displayName,
      description: friend.user.city,
    }));
  }, [friendsQuery.data]);

  return (
    <section className="page meetup-create-page">
      <p className="back">
        <Link
          to="/meetups"
          search={{ page: 1, upcoming: "true" }}
          className="text-link"
        >
          ← Meetups
        </Link>
      </p>
      <h1>Host a meetup</h1>
      <form
        className="stack-form meetup-create-form"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const gameId = String(fd.get("gameId") ?? "");
          const mp = fd.get("maxPlayers");
          const visibility = String(fd.get("visibility") ?? "PUBLIC");
          create.mutate({
            title: String(fd.get("title") ?? "").trim(),
            scheduledAt: new Date(
              String(fd.get("scheduledAt") ?? ""),
            ).toISOString(),
            ...(gameId ? { gameId } : {}),
            location: String(fd.get("location") ?? "").trim() || undefined,
            ...(mp !== '' && mp != null
              ? { maxPlayers: Number(mp) }
              : {}),
            description: String(fd.get("description") ?? "").trim() || undefined,
            ...(visibility === "PUBLIC" ||
            visibility === "FRIENDS" ||
            visibility === "INVITE_ONLY"
              ? { visibility }
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
            <input name="title" required className="input" maxLength={200} />
          </label>
          <label className="field">
            <span>When</span>
            <input
              name="scheduledAt"
              type="datetime-local"
              required
              className="input"
              defaultValue={defaultWhen()}
            />
          </label>
          <label className="field">
            <span>Location</span>
            <input name="location" className="input" maxLength={500} />
          </label>
          <label className="field">
            <span>Max players (includes you)</span>
            <input
              name="maxPlayers"
              type="number"
              min={2}
              max={20}
              className="input"
              placeholder="e.g. 4"
            />
          </label>
          <label className="field">
            <span>Visibility</span>
            <select
              name="visibility"
              className="input"
              value={visibility}
              onChange={(e) => {
                const next = e.target.value as PlaySessionVisibility;
                setVisibility(next);
                if (next !== "INVITE_ONLY") {
                  setSelectedInviteeIds([]);
                }
              }}
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
                <button
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
                </button>
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
                  {gamesQuery.isFetching && (
                    <p className="muted">Searching…</p>
                  )}
                  {!gamesQuery.isFetching &&
                    gameSearch.trim().length < 2 && (
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
          {visibility === "INVITE_ONLY" && (
            <div className="field meetup-create-full">
              <span>Who should be invited</span>
              <MultiSelectPicker
                options={friendOptions}
                selectedIds={selectedInviteeIds}
                onChange={setSelectedInviteeIds}
                loading={friendsQuery.isLoading}
                searchPlaceholder="Search your friends by name"
                placeholder="Selected friends will be invited after meetup creation."
                emptyText="No matching friends. You can invite later from meetup details."
              />
            </div>
          )}
          <label className="field meetup-create-full">
            <span>Description</span>
            <textarea
              name="description"
              rows={4}
              className="input textarea"
              maxLength={4000}
            />
          </label>
        </div>
        {create.isError && (
          <p className="error" role="alert">
            {create.error instanceof Error ? create.error.message : "Could not create"}
          </p>
        )}
        {inviteWarning && (
          <p className="muted" role="status">
            {inviteWarning}
          </p>
        )}
        <div className="button-row">
          <button type="submit" className="button" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </section>
  );
}
