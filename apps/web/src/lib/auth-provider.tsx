import { useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AUTH_LOGOUT_EVENT } from './api';
import { AuthContext } from './auth-context';
import { logoutRequest, refreshAccessToken } from '../api/auth';
import {
  getAccessToken,
  setAccessToken,
  setAuthBootstrapPromise,
} from './auth-session';
import { disconnectSharedChatSocket } from './chat-socket';
import { queryKeys } from './query-keys';
import type { AuthUser } from '../api/types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(() => getAccessToken());

  const signIn = useCallback(
    (accessToken: string, user: AuthUser) => {
      setAccessToken(accessToken);
      setTokenState(accessToken);
      queryClient.setQueryData(queryKeys.auth.me, user);
    },
    [queryClient],
  );

  const signOut = useCallback(() => {
    void logoutRequest().catch(() => undefined);
    setAccessToken(null);
    disconnectSharedChatSocket();
    setTokenState(null);
    queryClient.removeQueries({ queryKey: queryKeys.auth.me });
  }, [queryClient]);

  useEffect(() => {
    const bootstrap = refreshAccessToken()
      .then((result) => {
        setAccessToken(result.accessToken);
        setTokenState(result.accessToken);
      })
      .catch(() => {
        setAccessToken(null);
        setTokenState(null);
      });
    setAuthBootstrapPromise(bootstrap);
  }, []);

  useEffect(() => {
    const onLogout = () => {
      setAccessToken(null);
      disconnectSharedChatSocket();
      setTokenState(null);
      queryClient.removeQueries({ queryKey: queryKeys.auth.me });
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
  }, [queryClient]);

  const value = useMemo(
    () => ({ token, signIn, signOut }),
    [token, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
