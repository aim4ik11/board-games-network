import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import {
  cancelMeetup,
  fetchMeetup,
  joinMeetup,
  leaveMeetup,
  patchMeetup,
} from "../api/meetups";
import { useAuthMe } from "../hooks/use-auth-me";
import { requestAuthModal } from "../lib/auth-modal-intent";
import { toDatetimeLocalValue } from "../lib/datetime-local";
import { queryKeys } from "../lib/query-keys";
import { useAuth } from "../lib/use-auth";

const routeApi = getRouteApi("/meetups/$meetupId");

export function MeetupDetailPage() {
  const { meetupId } = routeApi.useParams();
  const { token } = useAuth();
  const me = useAuthMe();
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: queryKeys.meetups.detail(meetupId),
    queryFn: () => fetchMeetup(meetupId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.meetups.all });
  };

  const join = useMutation({
    mutationFn: () => joinMeetup(meetupId),
    onSuccess: invalidate,
  });
  const leave = useMutation({
    mutationFn: () => leaveMeetup(meetupId),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: () => cancelMeetup(meetupId),
    onSuccess: invalidate,
  });
  const save = useMutation({
    mutationFn: (body: Parameters<typeof patchMeetup>[1]) =>
      patchMeetup(meetupId, body),
    onSuccess: invalidate,
  });

  if (detailQuery.isLoading) {
    return (
      <section className="page">
        <p>Loading…</p>
      </section>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <section className="page">
        <p className="error" role="alert">
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : "Meetup not found"}
        </p>
        <Link
          to="/meetups"
          search={{ page: 1, upcoming: "true" }}
          className="text-link"
        >
          ← Meetups
        </Link>
      </section>
    );
  }

  const m = detailQuery.data;
  const myId = me.data?.id;
  const isHost = myId != null && m.host.id === myId;
  const isParticipant =
    myId != null && m.participants.some((p) => p.userId === myId);
  const isScheduled = m.status === "SCHEDULED";
  const full =
    m.maxPlayers != null && 1 + m.joinedParticipantCount >= m.maxPlayers;

  return (
    <section className="page">
      <p className="back">
        <Link
          to="/meetups"
          search={{ page: 1, upcoming: "true" }}
          className="text-link"
        >
          ← Meetups
        </Link>
      </p>
      <h1>{m.title}</h1>
      <p className="muted">
        {new Date(m.scheduledAt).toLocaleString()}
        {m.location && ` · ${m.location}`}
      </p>
      <p>
        Host:{" "}
        <Link
          to="/u/$userId"
          params={{ userId: m.host.id }}
          className="text-link"
        >
          {m.host.displayName}
        </Link>
      </p>
      {m.game && (
        <p>
          Game:{" "}
          <Link
            to="/games/$slug"
            params={{ slug: m.game.slug }}
            className="text-link"
          >
            {m.game.title}
          </Link>
        </p>
      )}
      {m.maxPlayers != null && (
        <p className="muted">
          Spots: {1 + m.joinedParticipantCount} / {m.maxPlayers} (host counts as
          one)
        </p>
      )}
      <p className="meetup-status-badge">{m.status}</p>
      {m.description && (
        <div className="prose">
          {m.description.split("\n").map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      <h2 className="h-aside">Participants</h2>
      <ul className="friend-rows">
        <li className="friend-row">
          <strong>{m.host.displayName}</strong>
          <span className="muted"> (host)</span>
        </li>
        {m.participants
          .filter((p) => p.status === "JOINED")
          .map((p) => (
            <li key={p.userId} className="friend-row">
              <Link
                to="/u/$userId"
                params={{ userId: p.userId }}
                className="text-link"
              >
                {p.displayName}
              </Link>
            </li>
          ))}
      </ul>

      {token && isScheduled && (
        <div className="meetup-actions">
          {!isHost && !isParticipant && (
            <button
              type="button"
              className="button"
              disabled={full || join.isPending}
              onClick={() => join.mutate()}
            >
              {full ? "Full" : join.isPending ? "Joining…" : "Join"}
            </button>
          )}
          {!isHost && isParticipant && (
            <button
              type="button"
              className="button ghost"
              disabled={leave.isPending}
              onClick={() => leave.mutate()}
            >
              {leave.isPending ? "Leaving…" : "Leave"}
            </button>
          )}
          {isHost && (
            <button
              type="button"
              className="button danger"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              {cancel.isPending ? "Cancelling…" : "Cancel meetup"}
            </button>
          )}
        </div>
      )}
      {(join.isError || leave.isError || cancel.isError) && (
        <p className="error" role="alert">
          {(join.error ?? leave.error ?? cancel.error) instanceof Error
            ? (join.error ?? leave.error ?? cancel.error)!.message
            : "Action failed"}
        </p>
      )}

      {token && isHost && isScheduled && (
        <>
          <h2 className="h-aside">Edit details</h2>
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const gameId = String(fd.get("gameId") ?? "");
              const mp = fd.get("maxPlayers");
              save.mutate({
                title: String(fd.get("title") ?? "").trim(),
                scheduledAt: new Date(
                  String(fd.get("scheduledAt") ?? ""),
                ).toISOString(),
                gameId,
                location: String(fd.get("location") ?? ""),
                ...(mp !== "" && mp != null ? { maxPlayers: Number(mp) } : {}),
                description: String(fd.get("description") ?? ""),
              });
            }}
          >
            <label className="field">
              <span>Title</span>
              <input
                name="title"
                required
                className="input"
                defaultValue={m.title}
                maxLength={200}
              />
            </label>
            <label className="field">
              <span>When</span>
              <input
                name="scheduledAt"
                type="datetime-local"
                required
                className="input"
                defaultValue={toDatetimeLocalValue(m.scheduledAt)}
              />
            </label>
            <label className="field">
              <span>
                Game ID (paste from catalog URL or leave empty to clear)
              </span>
              <input
                name="gameId"
                className="input"
                placeholder="clear field to remove game"
                defaultValue={m.game?.id ?? ""}
              />
            </label>
            <label className="field">
              <span>Location</span>
              <input
                name="location"
                className="input"
                defaultValue={m.location ?? ""}
              />
            </label>
            <label className="field">
              <span>Max players</span>
              <input
                name="maxPlayers"
                type="number"
                min={2}
                max={500}
                className="input"
                defaultValue={m.maxPlayers ?? ""}
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                name="description"
                rows={3}
                className="input textarea"
                defaultValue={m.description ?? ""}
              />
            </label>
            {save.isError && (
              <p className="error" role="alert">
                {save.error instanceof Error
                  ? save.error.message
                  : "Save failed"}
              </p>
            )}
            <button type="submit" className="button" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </button>
          </form>
        </>
      )}

      {!token && isScheduled && (
        <p className="muted">
          <button
            type="button"
            className="link-button text-link"
            onClick={() => requestAuthModal("login")}
          >
            Sign in
          </button>{" "}
          to join.
        </p>
      )}
    </section>
  );
}
