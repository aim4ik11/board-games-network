import { useQuery } from '@tanstack/react-query';
import { Link, Outlet } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Home,
  Layers,
  Library,
  LogOut,
  MessageCircle,
  Settings,
  User,
  Users,
} from 'lucide-react';
import { fetchConversations } from '../api/chat';
import { AuthCard } from './auth-card';
import { useAuthMe } from '../hooks/use-auth-me';
import {
  consumePendingAuthModal,
  OPEN_AUTH_MODAL_EVENT,
  type AuthModalMode,
} from '../lib/auth-modal-intent';
import { friendsSearchDefault } from '../lib/friends-route-defaults';
import { gamesListSearchDefault } from '../lib/games-route-defaults';
import { meetupsSearchDefault } from '../lib/meetups-route-defaults';
import { queryKeys } from '../lib/query-keys';
import { setPendingAuthModal } from '../lib/auth-modal-intent';
import { useAuth } from '../lib/use-auth';
import styles from './root-layout.module.scss';

const collectionSearchDefault = { status: 'OWNED' as const };

function isAuthModalEvent(event: Event): event is CustomEvent<AuthModalMode> {
  const detail = (event as CustomEvent<unknown>).detail;
  return detail === 'login' || detail === 'register';
}

const navInactive = { className: styles.navItem };
const navActive = {
  className: `${styles.navItem} ${styles.navItemActive}`,
};

function SidebarUserAvatar({
  avatarUrl,
  userName,
}: {
  avatarUrl: string | null | undefined;
  userName: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = userName.trim().charAt(0).toUpperCase() || 'P';
  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={userName}
        className={styles.avatar}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className={styles.avatarPlaceholder} aria-hidden>
      {initial}
    </span>
  );
}

export function RootLayout() {
  const { token, signOut } = useAuth();
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode | null>(() =>
    consumePendingAuthModal(),
  );
  const me = useAuthMe();
  const sidebarConversations = useQuery({
    queryKey: queryKeys.chat.sidebarRecent(),
    queryFn: fetchConversations,
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!authModalMode || token) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [authModalMode, token]);

  useEffect(() => {
    const onOpenAuthModal = (event: Event) => {
      if (isAuthModalEvent(event)) {
        setAuthModalMode(event.detail);
      }
    };

    window.addEventListener(OPEN_AUTH_MODAL_EVENT, onOpenAuthModal);
    return () => {
      window.removeEventListener(OPEN_AUTH_MODAL_EVENT, onOpenAuthModal);
    };
  }, []);

  useEffect(() => {
    if (token) {
      return;
    }
    const protectedPrefixes = [
      '/friends',
      '/collection',
      '/profile',
      '/messages',
      '/meetups',
      '/settings',
    ];
    const path = window.location.pathname;
    if (protectedPrefixes.some((prefix) => path.startsWith(prefix))) {
      setPendingAuthModal('login');
      window.location.assign('/games');
    }
  }, [token]);

  const userName = me.data?.displayName ?? 'Player';
  const chatBadgeCount = token
    ? (sidebarConversations.data?.length ?? 0)
    : 0;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Main navigation">
        <div className={styles.brandRow}>
          <div className={styles.logoMark} aria-hidden>
            G
          </div>
          <span className={styles.brandText}>GAME HUB</span>
        </div>

        <div className={styles.navScroll}>
          <div>
            <h2 className={styles.navSectionLabel}>Menu</h2>
            <ul className={styles.navList}>
              <li>
                <Link
                  to="/games"
                  search={gamesListSearchDefault}
                  inactiveProps={navInactive}
                  activeProps={navActive}
                >
                  <Library className={styles.navIcon} strokeWidth={2} />
                  Catalog
                </Link>
              </li>
              <li>
                <Link
                  to="/home"
                  inactiveProps={navInactive}
                  activeProps={navActive}
                >
                  <Home className={styles.navIcon} strokeWidth={2} />
                  Home
                </Link>
              </li>
              {token ? (
                <>
                  <li>
                    <Link
                      to="/collection"
                      search={collectionSearchDefault}
                      inactiveProps={navInactive}
                      activeProps={navActive}
                    >
                      <Layers className={styles.navIcon} strokeWidth={2} />
                      My Collection
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/friends"
                      search={friendsSearchDefault}
                      inactiveProps={navInactive}
                      activeProps={navActive}
                    >
                      <Users className={styles.navIcon} strokeWidth={2} />
                      Friends
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/meetups"
                      search={meetupsSearchDefault}
                      inactiveProps={navInactive}
                      activeProps={navActive}
                    >
                      <CalendarDays className={styles.navIcon} strokeWidth={2} />
                      Meetups
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/messages"
                      inactiveProps={navInactive}
                      activeProps={navActive}
                    >
                      <MessageCircle className={styles.navIcon} strokeWidth={2} />
                      Chat
                      {chatBadgeCount > 0 ? (
                        <span className={styles.badge}>{chatBadgeCount}</span>
                      ) : null}
                    </Link>
                  </li>
                </>
              ) : null}
            </ul>
          </div>

          {token ? (
            <div>
              <h2 className={styles.navSectionLabel}>Account</h2>
              <ul className={styles.navList}>
                <li>
                  <Link
                    to="/profile"
                    inactiveProps={navInactive}
                    activeProps={navActive}
                  >
                    <User className={styles.navIcon} strokeWidth={2} />
                    User Profile
                  </Link>
                </li>
                <li>
                  <Link
                    to="/settings"
                    inactiveProps={navInactive}
                    activeProps={navActive}
                  >
                    <Settings className={styles.navIcon} strokeWidth={2} />
                    Settings
                  </Link>
                </li>
              </ul>
            </div>
          ) : null}

        </div>

        <div className={styles.sidebarFooter}>
          {token ? (
            <div className={styles.userRow}>
              <SidebarUserAvatar
                key={me.data?.avatarUrl ?? ''}
                avatarUrl={me.data?.avatarUrl}
                userName={userName}
              />
              <div className={styles.userMeta}>
                <div className={styles.userName}>
                  {me.isLoading ? 'Loading…' : userName}
                </div>
                <div className={styles.userSub}>
                  {me.data?.email ?? 'Member'}
                </div>
              </div>
              <button
                type="button"
                className={styles.signOut}
                aria-label="Sign out"
                onClick={() => signOut()}
              >
                <LogOut size={18} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className={styles.guestFooter}>
              <button
                type="button"
                className={styles.signInBtn}
                onClick={() => setAuthModalMode('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`${styles.navItem} link-button`}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  justifyContent: 'center',
                }}
                onClick={() => setAuthModalMode('register')}
              >
                Create account
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <div className={styles.ambient} aria-hidden />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      {authModalMode &&
        !token &&
        createPortal(
          <div
            className={styles.authBackdrop}
            role="presentation"
            onClick={() => setAuthModalMode(null)}
          >
            <div
              className={styles.authPanel}
              role="dialog"
              aria-modal="true"
              aria-label="Authentication"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.authClose}
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
