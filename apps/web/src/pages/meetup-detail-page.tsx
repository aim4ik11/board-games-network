import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import {
  cancelMeetup,
  fetchMeetup,
  joinMeetup,
  leaveMeetup,
} from "../api/meetups";
import { MeetupGamePreview } from "../components/meetup-game-preview";
import { UserIdentity } from "../components/user-identity";
import { Button, buttonClassName } from "../components/ui";
import { useAuthMe } from "../hooks/use-auth-me";
import { requestAuthModal } from "../lib/auth-modal-intent";
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
      {m.game && (
        <MeetupGamePreview game={m.game} />
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
      <ul className="user-card-grid">
        <li className="user-card">
          <UserIdentity
            userId={m.host.id}
            displayName={m.host.displayName}
            avatarUrl={m.host.avatarUrl}
            subtitle="Host"
            isCurrentUser={m.host.id === myId}
          />
        </li>
        {m.participants
          .filter((p) => p.status === "JOINED")
          .map((p) => (
            <li key={p.userId} className="user-card">
              <UserIdentity
                userId={p.userId}
                displayName={p.displayName}
                avatarUrl={p.avatarUrl}
                isCurrentUser={p.userId === myId}
              />
            </li>
          ))}
      </ul>

      {token && isScheduled && (
        <div className="meetup-actions">
          {!isHost && !isParticipant && (
            <Button
              disabled={full || join.isPending}
              onClick={() => join.mutate()}
            >
              {full ? "Full" : join.isPending ? "Joining…" : "Join"}
            </Button>
          )}
          {!isHost && isParticipant && (
            <Button
              variant="ghost"
              disabled={leave.isPending}
              onClick={() => leave.mutate()}
            >
              {leave.isPending ? "Leaving…" : "Leave"}
            </Button>
          )}
          {isHost && (
            <>
              <Link
                to="/meetups/$meetupId/edit"
                params={{ meetupId }}
                className={buttonClassName({ variant: "ghost" })}
              >
                Edit meetup
              </Link>
              <Link
                to="/meetups/$meetupId/invite"
                params={{ meetupId }}
                className={buttonClassName({ variant: "ghost" })}
              >
                Invite players
              </Link>
              <Button
                variant="danger"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                {cancel.isPending ? "Cancelling…" : "Cancel meetup"}
              </Button>
            </>
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
