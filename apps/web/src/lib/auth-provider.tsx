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
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from './auth-storage';
import { disconnectSharedChatSocket } from './chat-socket';
import { queryKeys } from './query-keys';
import type { AuthUser } from '../api/types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() =>
    getStoredAccessToken(),
  );

  const signIn = useCallback(
    (accessToken: string, user: AuthUser) => {
      setStoredAccessToken(accessToken);
      setToken(accessToken);
      queryClient.setQueryData(queryKeys.auth.me, user);
    },
    [queryClient],
  );

  const signOut = useCallback(() => {
    clearStoredAccessToken();
    disconnectSharedChatSocket();
    setToken(null);
    queryClient.removeQueries({ queryKey: queryKeys.auth.me });
  }, [queryClient]);

  useEffect(() => {
    const onLogout = () => {
      clearStoredAccessToken();
      disconnectSharedChatSocket();
      setToken(null);
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
