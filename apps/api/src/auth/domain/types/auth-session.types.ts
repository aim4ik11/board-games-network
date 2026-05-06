export type CreateAuthSessionInput = {
  userId: string;
  refreshTokenHash: string;
  tokenFamily: string;
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
};

export type AuthSessionRecord = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  tokenFamily: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBySessionId: string | null;
};

export type CreatePasswordResetTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  requestedIp: string | null;
  userAgent: string | null;
};

export type PasswordResetTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};
