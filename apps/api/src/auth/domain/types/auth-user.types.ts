/** Authenticated user surface exposed to HTTP and other modules (no secrets). */
export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  city: string | null;
  avatarUrl: string | null;
};

/** Public profile card (no email) for user discovery / profiles. */
export type PublicUserCard = Omit<AuthUser, 'email'>;

export type PublicProfileGamePreview = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
};

export type PublicProfileSummary = {
  user: PublicUserCard;
  stats: {
    collectionTotal: number;
    ownedCount: number;
    wishlistCount: number;
    previouslyOwnedCount: number;
    friendsCount: number;
    ratingsCount: number;
    reviewsCount: number;
  };
  collectionPreview: {
    owned: PublicProfileGamePreview[];
    wishlist: PublicProfileGamePreview[];
    previouslyOwned: PublicProfileGamePreview[];
  };
};
