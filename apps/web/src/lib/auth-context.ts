import { createContext } from 'react';
import type { AuthUser } from '../api/types';

export type AuthContextValue = {
  token: string | null;
  signIn: (accessToken: string, user: AuthUser) => void;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
