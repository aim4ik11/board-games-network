import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import { RootLayout } from './components/root-layout';
import { getStoredAccessToken } from './lib/auth-storage';
import { setPendingAuthModal } from './lib/auth-modal-intent';
import { gamesListSearchDefault } from './lib/games-route-defaults';
import { CollectionPage } from './pages/collection-page';
import { FriendsPage } from './pages/friends-page';
import { MessagesListPage } from './pages/messages-list-page';
import { MessagesThreadPage } from './pages/messages-thread-page';
import { GameDetailPage } from './pages/game-detail-page';
import { GamesListPage } from './pages/games-list-page';
import { MeetupDetailPage } from './pages/meetup-detail-page';
import { MeetupEditPage } from './pages/meetup-edit-page';
import { MeetupInvitePage } from './pages/meetup-invite-page';
import { MeetupNewPage } from './pages/meetup-new-page';
import { MeetupsListPage } from './pages/meetups-list-page';
import { ProfilePage } from './pages/profile-page';
import { PublicUserPage } from './pages/public-user-page';

const COLLECTION_STATUSES = ['OWNED', 'WISHLIST', 'PREVIOUSLY_OWNED'] as const;
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

function redirectToLoginModal(): never {
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

const gamesListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games',
  validateSearch: (raw: Record<string, unknown>) => ({
    q: typeof raw.q === 'string' ? raw.q : '',
    page:
      typeof raw.page === 'string'
        ? Math.max(1, Number.parseInt(raw.page, 10) || 1)
        : typeof raw.page === 'number' && Number.isFinite(raw.page)
          ? Math.max(1, raw.page)
          : 1,
  }),
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
  beforeLoad: () => {
    if (!getStoredAccessToken()) {
      redirectToLoginModal();
    }
  },
  component: CollectionPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: () => {
    if (!getStoredAccessToken()) {
      redirectToLoginModal();
    }
  },
  component: ProfilePage,
});

const publicUserRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/u/$userId',
  component: PublicUserPage,
});

const messagesListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/messages',
  beforeLoad: () => {
    if (!getStoredAccessToken()) {
      redirectToLoginModal();
    }
  },
  component: MessagesListPage,
});

const messagesThreadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/messages/$conversationId',
  beforeLoad: () => {
    if (!getStoredAccessToken()) {
      redirectToLoginModal();
    }
  },
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
  }),
  beforeLoad: () => {
    if (!getStoredAccessToken()) {
      redirectToLoginModal();
    }
  },
  component: MeetupsListPage,
});

const meetupsNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/meetups/new',
  beforeLoad: () => {
    if (!getStoredAccessToken()) {
      redirectToLoginModal();
    }
  },
  component: MeetupNewPage,
});

const meetupsDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/meetups/$meetupId',
  beforeLoad: () => {
    if (!getStoredAccessToken()) {
      redirectToLoginModal();
    }
  },
  component: MeetupDetailPage,
});

const meetupsInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/meetups/$meetupId/invite',
  beforeLoad: () => {
    if (!getStoredAccessToken()) {
      redirectToLoginModal();
    }
  },
  component: MeetupInvitePage,
});

const meetupsEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/meetups/$meetupId/edit',
  beforeLoad: () => {
    if (!getStoredAccessToken()) {
      redirectToLoginModal();
    }
  },
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
  beforeLoad: () => {
    if (!getStoredAccessToken()) {
      redirectToLoginModal();
    }
  },
  component: FriendsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  gamesListRoute,
  gameDetailRoute,
  collectionRoute,
  profileRoute,
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
