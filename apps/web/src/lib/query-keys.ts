export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  games: {
    all: ['games'] as const,
    list: (q: { q: string; page: number }) =>
      [...queryKeys.games.all, 'list', q] as const,
    detail: (slug: string) => [...queryKeys.games.all, 'detail', slug] as const,
  },
  collection: {
    all: ['collection'] as const,
    list: (status: string) =>
      [...queryKeys.collection.all, 'list', status] as const,
    entry: (slug: string) =>
      [...queryKeys.collection.all, 'entry', slug] as const,
  },
  users: {
    public: (id: string) => ['users', 'public', id] as const,
  },
  friends: {
    all: ['friends'] as const,
    discover: (q: { q: string; page: number }) =>
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
  },
  chat: {
    all: ['chat'] as const,
    conversations: () => [...queryKeys.chat.all, 'conversations'] as const,
    messages: (conversationId: string, page: number) =>
      [...queryKeys.chat.all, 'messages', conversationId, page] as const,
  },
} as const;
