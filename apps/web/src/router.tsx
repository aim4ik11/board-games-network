import { COLLECTION_STATUSES } from '@boardgame/shared';
import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import { RootLayout } from './components/root-layout';
import { setPendingAuthModal } from './lib/auth-modal-intent';
import { getAccessToken, waitForAuthBootstrap } from './lib/auth-session';
import {
  gamesListSearchDefault,
  parseGamesListSearch,
} from './lib/games-route-defaults';
import { CollectionPage } from './pages/collection/collection-page';
import { FriendsPage } from './pages/friends/friends-page';
import { MessagesListPage } from './pages/messages-list/messages-list-page';
import { MessagesThreadPage } from './pages/messages-thread/messages-thread-page';
import { GameDetailPage } from './pages/game-detail/game-detail-page';
import { GamesListPage } from './pages/games-list/games-list-page';
import { MeetupDetailPage } from './pages/meetup-detail/meetup-detail-page';
import { MeetupEditPage } from './pages/meetup-edit/meetup-edit-page';
import { MeetupInvitePage } from './pages/meetup-invite/meetup-invite-page';
import { MeetupNewPage } from './pages/meetup-new/meetup-new-page';
import { MeetupsListPage } from './pages/meetups-list/meetups-list-page';
import { HomePage } from './pages/home/home-page';
import { ProfilePage } from './pages/profile/profile-page';
import { PublicUserPage } from './pages/public-user/public-user-page';
import { SettingsPage } from './pages/settings/settings-page';

type CollectionTab = (typeof COLLECTION_STATUSES)[number];

function parseCollectionStatus(raw: unknown): CollectionTab {
  return typeof raw === 'string' &&
    COLLECTION_STATUSES.includes(raw as CollectionTab)
    ? (raw as CollectionTab)
    : 'OWNED';
}

const FRIENDS_TABS = ['discover', 'friends', 'requests'] as const;
type FriendsTabRoute = (typeof FRIENDS_TABS)[number];

function parseFriendsTab(raw: unknown): FriendsTabRoute {
  return typeof raw === 'string' &&
    FRIENDS_TABS.includes(raw as FriendsTabRoute)
    ? (raw as FriendsTabRoute)
    : 'discover';
}

function parseMeetupsUpcoming(raw: unknown): 'true' | 'false' {
  return raw === 'false' ? 'false' : 'true';
}

function parseMeetupsView(raw: unknown): 'calendar' | 'list' {
  return raw === 'list' ? 'list' : 'calendar';
}

function parseMeetupsWeek(raw: unknown): string {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return '';
  }
  return raw;
}

function parseMeetupsVisibility(
  raw: unknown,
): 'ALL' | 'PUBLIC' | 'FRIENDS' {
  if (raw === 'PUBLIC' || raw === 'FRIENDS') {
    return raw;
  }
  return 'ALL';
}

function parseMeetupsJoined(raw: unknown): '' | 'me' {
  return raw === 'me' ? 'me' : '';
}

async function requireAuthOrRedirect(): Promise<void> {
  await waitForAuthBootstrap();
  if (getAccessToken()) {
    return;
  }
  setPendingAuthModal('login');
  throw redirect({ to: '/games', search: gamesListSearchDefault });
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/games', search: gamesListSearchDefault });
  },
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/home',
  component: HomePage,
});

const gamesListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games',
  validateSearch: (raw: Record<string, unknown>) =>
    parseGamesListSearch(raw),
  component: GamesListPage,
});

const gameDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/$slug',
  component: GameDetailPage,
});

const collectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collection',
  validateSearch: (raw: Record<string, unknown>) => ({
    status: parseCollectionStatus(raw.status),
  }),
  beforeLoad: () => requireAuthOrRedirect(),
  component: CollectionPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: () => requireAuthOrRedirect(),
  component: ProfilePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: () => requireAuthOrRedirect(),
  component: SettingsPage,
});

const publicUserRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/u/$userId',
  component: PublicUserPage,
});

const messagesListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/messages',
  beforeLoad: () => requireAuthOrRedirect(),
  component: MessagesListPage,
});

const messagesThreadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/messages/$conversationId',
  beforeLoad: () => requireAuthOrRedirect(),
  component: MessagesThreadPage,
});

const meetupsListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/meetups',
  validateSearch: (raw: Record<string, unknown>) => ({
    page:
      typeof raw.page === 'string'
        ? Math.max(1, Number.parseInt(raw.page, 10) || 1)
        : typeof raw.page === 'number' && Number.isFinite(raw.page)
          ? Math.max(1, raw.page)
          : 1,
    upcoming: parseMeetupsUpcoming(raw.upcoming),
    view: parseMeetupsView(raw.view),
    week: parseMeetupsWeek(raw.week),
    gameId: typeof raw.gameId === 'string' ? raw.gameId : '',
    visibility: parseMeetupsVisibility(raw.visibility),
    q: typeof raw.q === 'string' ? raw.q.slice(0, 120) : '',
    joined: parseMeetupsJoined(raw.joined),
  }),
  beforeLoad: () => requireAuthOrRedirect(),
  component: MeetupsListPage,
});

const meetupsNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/meetups/new',
  beforeLoad: () => requireAuthOrRedirect(),
  component: MeetupNewPage,
});

const meetupsDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/meetups/$meetupId',
  beforeLoad: () => requireAuthOrRedirect(),
  component: MeetupDetailPage,
});

const meetupsInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/meetups/$meetupId/invite',
  beforeLoad: () => requireAuthOrRedirect(),
  component: MeetupInvitePage,
});

const meetupsEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/meetups/$meetupId/edit',
  beforeLoad: () => requireAuthOrRedirect(),
  component: MeetupEditPage,
});

const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends',
  validateSearch: (raw: Record<string, unknown>) => ({
    tab: parseFriendsTab(raw.tab),
    q: typeof raw.q === 'string' ? raw.q : '',
    city: typeof raw.city === 'string' ? raw.city : '',
    page:
      typeof raw.page === 'string'
        ? Math.max(1, Number.parseInt(raw.page, 10) || 1)
        : typeof raw.page === 'number' && Number.isFinite(raw.page)
          ? Math.max(1, raw.page)
          : 1,
  }),
  beforeLoad: () => requireAuthOrRedirect(),
  component: FriendsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  homeRoute,
  gamesListRoute,
  gameDetailRoute,
  collectionRoute,
  profileRoute,
  settingsRoute,
  publicUserRoute,
  friendsRoute,
  meetupsListRoute,
  meetupsNewRoute,
  meetupsDetailRoute,
  meetupsInviteRoute,
  meetupsEditRoute,
  messagesListRoute,
  messagesThreadRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
