export type FriendsTab = 'discover' | 'friends' | 'requests';

export const friendsSearchDefault: {
  tab: FriendsTab;
  q: string;
  page: number;
} = { tab: 'discover', q: '', page: 1 };
