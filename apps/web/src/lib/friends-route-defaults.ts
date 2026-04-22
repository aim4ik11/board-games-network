export type FriendsTab = 'discover' | 'friends' | 'requests';

export const friendsSearchDefault: {
  tab: FriendsTab;
  q: string;
  city: string;
  page: number;
} = { tab: 'discover', q: '', city: '', page: 1 };
