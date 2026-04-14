import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { fetchMeetups } from "../api/meetups";
import { requestAuthModal } from "../lib/auth-modal-intent";
import { queryKeys } from "../lib/query-keys";
import { useAuth } from "../lib/use-auth";

const routeApi = getRouteApi("/meetups");

export function MeetupsListPage() {
  const { page, upcoming } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { token } = useAuth();

  const listQuery = useQuery({
    queryKey: queryKeys.meetups.list({ page, upcoming }),
    queryFn: () =>
      fetchMeetups({
        page,
        limit: 20,
        upcoming,
      }),
  });

  const totalPages =
    listQuery.data != null
      ? Math.max(
          1,
          Math.ceil(listQuery.data.meta.total / listQuery.data.meta.limit),
        )
      : 1;

  return (
    <section className="page">
      <div className="meetups-head">
        <h1>Meetups</h1>
        {token && (
          <Link to="/meetups/new" className="button">
            Host a meetup
          </Link>
        )}
      </div>
      <p className="muted">
        Scheduled play sessions.{" "}
        {!token && (
          <>
            <button
              type="button"
              className="link-button text-link"
              onClick={() => requestAuthModal("login")}
            >
              Sign in
            </button>{" "}
            to host or join.
          </>
        )}
      </p>
      <div className="segmented" role="group" aria-label="Time filter">
        <button
          type="button"
          className={upcoming === "true" ? "active" : ""}
          onClick={() =>
            void navigate({ search: { page: 1, upcoming: "true" } })
          }
        >
          Upcoming
        </button>
        <button
          type="button"
          className={upcoming === "false" ? "active" : ""}
          onClick={() =>
            void navigate({ search: { page: 1, upcoming: "false" } })
          }
        >
          All times
        </button>
      </div>

      {listQuery.isLoading && <p>Loading…</p>}
      {listQuery.isError && (
        <p className="error" role="alert">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : "Failed to load meetups"}
        </p>
      )}
      {listQuery.data && (
        <>
          <ul className="meetup-cards">
            {listQuery.data.data.map((m) => (
              <li key={m.id}>
                <Link
                  to="/meetups/$meetupId"
                  params={{ meetupId: m.id }}
                  className="meetup-card"
                >
                  <div className="meetup-card-title">{m.title}</div>
                  <div className="muted">
                    {new Date(m.scheduledAt).toLocaleString()}
                    {m.location && ` · ${m.location}`}
                  </div>
                  <div className="muted">
                    Host: {m.host.displayName}
                    {m.game && ` · ${m.game.title}`}
                    {m.maxPlayers != null &&
                      ` · ${1 + m.joinedParticipantCount}/${m.maxPlayers} spots`}
                  </div>
                  <div className="meetup-status">{m.status}</div>
                </Link>
              </li>
            ))}
          </ul>
          {listQuery.data.data.length === 0 && (
            <p className="muted">No meetups match this filter.</p>
          )}
          <div className="pagination">
            <button
              type="button"
              className="button ghost"
              disabled={page <= 1}
              onClick={() =>
                void navigate({ search: { upcoming, page: page - 1 } })
              }
            >
              Previous
            </button>
            <span className="muted">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="button ghost"
              disabled={page >= totalPages}
              onClick={() =>
                void navigate({ search: { upcoming, page: page + 1 } })
              }
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
