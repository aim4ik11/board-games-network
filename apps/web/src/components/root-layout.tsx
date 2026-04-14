import { useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "@tanstack/react-router";
import { fetchConversations } from "../api/chat";
import { fetchMeetups } from "../api/meetups";
import { useAuthMe } from "../hooks/use-auth-me";
import { useAuth } from "../lib/use-auth";
import { friendsSearchDefault } from "../lib/friends-route-defaults";
import { meetupsSearchDefault } from "../lib/meetups-route-defaults";
import { gamesListSearchDefault } from "../lib/games-route-defaults";
import { queryKeys } from "../lib/query-keys";

const collectionSearchDefault = { status: "OWNED" as const };

export function RootLayout() {
  const { token, signOut } = useAuth();
  const me = useAuthMe();
  const sidebarMeetups = useQuery({
    queryKey: [...queryKeys.meetups.all, "sidebar-upcoming"],
    queryFn: () => fetchMeetups({ page: 1, limit: 5, upcoming: "true" }),
    enabled: Boolean(token),
  });
  const sidebarConversations = useQuery({
    queryKey: [...queryKeys.chat.all, "sidebar-recent"],
    queryFn: fetchConversations,
    enabled: Boolean(token),
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand">
          Board games
        </Link>
        <nav className="app-nav">
          <Link
            to="/games"
            search={gamesListSearchDefault}
            activeProps={{ className: "active" }}
          >
            Catalog
          </Link>
          <Link
            to="/meetups"
            search={meetupsSearchDefault}
            activeProps={{ className: "active" }}
          >
            Meetups
          </Link>
          {token ? (
            <>
              <Link
                to="/collection"
                search={collectionSearchDefault}
                activeProps={{ className: "active" }}
              >
                Collection
              </Link>
              <Link to="/profile" activeProps={{ className: "active" }}>
                Profile
              </Link>
              <Link
                to="/friends"
                search={friendsSearchDefault}
                activeProps={{ className: "active" }}
              >
                Friends
              </Link>
              <Link to="/messages" activeProps={{ className: "active" }}>
                Messages
              </Link>
              <span className="app-user">
                {me.isLoading ? "…" : (me.data?.displayName ?? "Signed in")}
              </span>
              <button
                type="button"
                className="link-button"
                onClick={() => signOut()}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                search={{ mode: "login" }}
                activeProps={{ className: "active" }}
              >
                Sign in
              </Link>
            </>
          )}
        </nav>
      </header>
      <div className="app-body">
        <aside className="app-aside app-aside-left">
          <section className="side-card">
            <h3>Quick links</h3>
            <nav className="side-list">
              <Link to="/games" search={gamesListSearchDefault}>
                Browse catalog
              </Link>
              <Link to="/meetups" search={meetupsSearchDefault}>
                Find meetups
              </Link>
              {token ? (
                <>
                  <Link to="/friends" search={friendsSearchDefault}>
                    Discover players
                  </Link>
                  <Link to="/messages">Open inbox</Link>
                </>
              ) : (
                <Link to="/login" search={{ mode: "register" }}>
                  Create account
                </Link>
              )}
            </nav>
          </section>
          <section className="side-card">
            <h3>Upcoming meetups</h3>
            {!token && (
              <p className="muted">
                Sign in to see meetups relevant to your network.
              </p>
            )}
            {token && sidebarMeetups.isLoading && (
              <p className="muted">Loading…</p>
            )}
            {token &&
              sidebarMeetups.data &&
              sidebarMeetups.data.data.length === 0 && (
                <p className="muted">No upcoming meetups yet.</p>
              )}
            {token &&
              sidebarMeetups.data &&
              sidebarMeetups.data.data.length > 0 && (
                <ul className="side-feed">
                  {sidebarMeetups.data.data.map((m) => (
                    <li key={m.id}>
                      <Link to="/meetups/$meetupId" params={{ meetupId: m.id }}>
                        <span className="side-feed-title">{m.title}</span>
                        <span className="muted">
                          {new Date(m.scheduledAt).toLocaleDateString()}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
          </section>
        </aside>
        <main className="app-main">
          <Outlet />
        </main>
        <aside className="app-aside app-aside-right">
          <section className="side-card">
            <h3>Recent chats</h3>
            {!token && (
              <p className="muted">
                Sign in to keep your conversations in sync.
              </p>
            )}
            {token && sidebarConversations.isLoading && (
              <p className="muted">Loading…</p>
            )}
            {token &&
              sidebarConversations.data &&
              sidebarConversations.data.length === 0 && (
                <p className="muted">No conversations yet.</p>
              )}
            {token &&
              sidebarConversations.data &&
              sidebarConversations.data.length > 0 && (
                <ul className="side-feed">
                  {sidebarConversations.data.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <Link
                        to="/messages/$conversationId"
                        params={{ conversationId: c.id }}
                      >
                        <span className="side-feed-title">
                          {c.otherUser?.displayName ?? "Conversation"}
                        </span>
                        <span className="muted">
                          {c.lastMessage?.body
                            ? c.lastMessage.body.slice(0, 48)
                            : "No messages yet"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
          </section>
          {token && (
            <section className="side-card">
              <h3>Your status</h3>
              <p className="muted">
                Signed in as <strong>{me.data?.displayName ?? "player"}</strong>
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
