import { useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchConversations } from "../api/chat";
import { fetchMeetups } from "../api/meetups";
import { AuthCard } from "./auth-card";
import { useAuthMe } from "../hooks/use-auth-me";
import {
  consumePendingAuthModal,
  OPEN_AUTH_MODAL_EVENT,
  type AuthModalMode,
} from "../lib/auth-modal-intent";
import { useAuth } from "../lib/use-auth";
import { friendsSearchDefault } from "../lib/friends-route-defaults";
import { meetupsSearchDefault } from "../lib/meetups-route-defaults";
import { gamesListSearchDefault } from "../lib/games-route-defaults";
import { queryKeys } from "../lib/query-keys";

const collectionSearchDefault = { status: "OWNED" as const };

export function RootLayout() {
  const { token, signOut } = useAuth();
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!authModalMode) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [authModalMode]);

  useEffect(() => {
    const pendingMode = consumePendingAuthModal();
    if (pendingMode) {
      setAuthModalMode(pendingMode);
    }

    const onOpenAuthModal = (event: Event) => {
      const mode = (event as CustomEvent<AuthModalMode>).detail;
      if (mode === "register" || mode === "login") {
        setAuthModalMode(mode);
      }
    };

    window.addEventListener(OPEN_AUTH_MODAL_EVENT, onOpenAuthModal);
    return () => {
      window.removeEventListener(OPEN_AUTH_MODAL_EVENT, onOpenAuthModal);
    };
  }, []);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isUserMenuOpen]);

  const userName = me.data?.displayName ?? "Player";
  const avatarInitial = userName.trim().charAt(0).toUpperCase() || "P";

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
          {token ? (
            <>
              <Link
                to="/meetups"
                search={meetupsSearchDefault}
                activeProps={{ className: "active" }}
              >
                Meetups
              </Link>
              <Link
                to="/friends"
                search={friendsSearchDefault}
                activeProps={{ className: "active" }}
              >
                Friends
              </Link>
              <div className="user-menu" ref={userMenuRef}>
                <button
                  type="button"
                  className="user-menu-trigger"
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  aria-label="Open user menu"
                  onClick={() => setIsUserMenuOpen((current) => !current)}
                >
                  {me.data?.avatarUrl ? (
                    <img
                      src={me.data.avatarUrl}
                      alt={userName}
                      className="user-avatar"
                    />
                  ) : (
                    <span className="user-avatar user-avatar-placeholder">
                      {avatarInitial}
                    </span>
                  )}
                </button>
                {isUserMenuOpen && (
                  <div className="user-menu-panel" role="menu">
                    <div className="user-menu-head">
                      <span className="user-menu-name">
                        {me.isLoading ? "Loading…" : userName}
                      </span>
                      <span className="muted">{me.data?.email}</span>
                    </div>
                    <Link
                      to="/profile"
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/collection"
                      search={collectionSearchDefault}
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Collection
                    </Link>
                    <Link
                      to="/messages"
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Messages
                    </Link>
                    <button
                      type="button"
                      className="user-menu-signout"
                      role="menuitem"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut();
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              className="link-button"
              onClick={() => setAuthModalMode("login")}
            >
              Sign in
            </button>
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
              {token ? (
                <>
                  <Link to="/meetups" search={meetupsSearchDefault}>
                    Find meetups
                  </Link>
                  <Link to="/friends" search={friendsSearchDefault}>
                    Discover players
                  </Link>
                  <Link to="/messages">Open inbox</Link>
                </>
              ) : (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setAuthModalMode("register")}
                >
                  Create account
                </button>
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
      {authModalMode &&
        createPortal(
          <div
            className="auth-modal-backdrop"
            role="presentation"
            onClick={() => setAuthModalMode(null)}
          >
            <div
              className="auth-modal-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Authentication"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setAuthModalMode(null)}
                aria-label="Close authentication modal"
              >
                ×
              </button>
              <AuthCard
                mode={authModalMode}
                onModeChange={setAuthModalMode}
                onSuccess={() => setAuthModalMode(null)}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
