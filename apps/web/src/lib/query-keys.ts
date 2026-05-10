export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  games: {
    all: ['games'] as const,
    list: (q: {
      q: string;
      page: number;
      limit: number;
      genres: string;
      ptMin: string;
      ptMax: string;
      complexity: string;
      sort: 'title' | 'year';
      order: 'asc' | 'desc';
    }) => [...queryKeys.games.all, 'list', q] as const,
    /** First page, up to 100 rows — mock-only sorts (bgg, rating, trending). */
    batch: (q: {
      q: string;
      genres: string;
      ptMin: string;
      ptMax: string;
      complexity: string;
    }) => [...queryKeys.games.all, 'batch', q] as const,
    detail: (slug: string) => [...queryKeys.games.all, 'detail', slug] as const,
    reviews: (slug: string, q: { page: number; limit: number }) =>
      [...queryKeys.games.all, 'reviews', slug, q] as const,
  },
  collection: {
    all: ['collection'] as const,
    /** All statuses (no query param) — for catalog badges. */
    allEntries: () => [...queryKeys.collection.all, 'all'] as const,
    list: (status: string) =>
      [...queryKeys.collection.all, 'list', status] as const,
    entry: (slug: string) =>
      [...queryKeys.collection.all, 'entry', slug] as const,
  },
  users: {
    public: (id: string) => ['users', 'public', id] as const,
    summary: (id: string) => [...queryKeys.users.public(id), 'summary'] as const,
  },
  friends: {
    all: ['friends'] as const,
    discover: (q: { q: string; city: string; page: number }) =>
      [...queryKeys.friends.all, 'discover', q] as const,
    list: () => [...queryKeys.friends.all, 'list'] as const,
    incoming: () => [...queryKeys.friends.all, 'incoming'] as const,
    outgoing: () => [...queryKeys.friends.all, 'outgoing'] as const,
  },
  meetups: {
    all: ['meetups'] as const,
    list: (q: { page: number; upcoming: string }) =>
      [...queryKeys.meetups.all, 'list', q] as const,
    detail: (id: string) => [...queryKeys.meetups.all, 'detail', id] as const,
    sidebarUpcoming: () => [...queryKeys.meetups.all, 'sidebar-upcoming'] as const,
  },
  chat: {
    all: ['chat'] as const,
    conversations: () => [...queryKeys.chat.all, 'conversations'] as const,
    messages: (conversationId: string, page: number) =>
      [...queryKeys.chat.all, 'messages', conversationId, page] as const,
    sidebarRecent: () => [...queryKeys.chat.all, 'sidebar-recent'] as const,
  },
} as const;
