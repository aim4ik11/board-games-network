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
