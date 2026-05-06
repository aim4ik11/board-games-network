import { UnauthorizedException } from '@nestjs/common';
import { AuthApplicationService } from './auth.application.service';

describe('AuthApplicationService', () => {
  const authUsersRepository = {
    existsByEmail: jest.fn(),
    createRegisteredUser: jest.fn(),
    findWithCredentialsByEmail: jest.fn(),
    findPublicProfileById: jest.fn(),
    findIdByEmail: jest.fn(),
    updatePasswordHash: jest.fn(),
  };
  const authSessionsRepository = {
    createSession: jest.fn(),
    findSessionById: jest.fn(),
    rotateSession: jest.fn(),
    revokeSession: jest.fn(),
    revokeSessionFamily: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    createPasswordResetToken: jest.fn(),
    findActiveResetTokenById: jest.fn(),
    markPasswordResetTokenUsed: jest.fn(),
  };
  const passwordHasher = {
    hash: jest.fn(),
    verify: jest.fn(),
  };
  const accessTokenIssuer = {
    issueAccessToken: jest.fn(),
  };
  const refreshTokenService = {
    generateTokenFamily: jest.fn(),
    generateOpaqueToken: jest.fn(),
    hashToken: jest.fn(),
  };

  let service: AuthApplicationService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AuthApplicationService(
      authUsersRepository as never,
      authSessionsRepository as never,
      passwordHasher as never,
      accessTokenIssuer as never,
      refreshTokenService as never,
    );
  });

  it('refresh rotates session and issues new access token', async () => {
    refreshTokenService.hashToken.mockReturnValueOnce('old-hash');
    authSessionsRepository.findSessionById.mockResolvedValueOnce({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'old-hash',
      tokenFamily: 'family-1',
      expiresAt: new Date(Date.now() + 10_000),
      revokedAt: null,
      replacedBySessionId: null,
    });
    authUsersRepository.findPublicProfileById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test',
      bio: null,
      city: null,
      avatarUrl: null,
    });
    refreshTokenService.generateOpaqueToken.mockReturnValueOnce('next-secret');
    refreshTokenService.hashToken.mockReturnValueOnce('next-hash');
    authSessionsRepository.createSession.mockResolvedValueOnce({
      id: 'session-2',
    });
    accessTokenIssuer.issueAccessToken.mockReturnValueOnce('access-2');

    const result = await service.refresh('session-1.secret', {
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(result.accessToken).toBe('access-2');
    expect(result.refreshToken).toBe('session-2.next-secret');
    expect(authSessionsRepository.rotateSession).toHaveBeenCalledWith({
      sessionId: 'session-1',
      nextSessionId: 'session-2',
    });
  });

  it('refresh rejects invalid token format', async () => {
    await expect(
      service.refresh('invalid-token', { ip: null, userAgent: null }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
