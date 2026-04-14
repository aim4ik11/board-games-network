/** JWT access-token claims (sub = user id). */
export type JwtAccessTokenPayload = {
  sub: string;
  email: string;
};
