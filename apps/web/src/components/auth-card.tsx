import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loginRequest, registerRequest } from '../api/auth';
import { ApiError, getApiBaseUrl } from '../lib/api';
import { useAuth } from '../lib/use-auth';
import styles from './auth-card.module.scss';
import seg from './ui/segmented.module.scss';

export type AuthMode = 'login' | 'register';

export function AuthCard({
  mode,
  onModeChange,
  onSuccess,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSuccess?: () => void;
}) {
  const { signIn } = useAuth();
  const queryClient = useQueryClient();
  const isRegister = mode === 'register';

  const login = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      signIn(data.accessToken, data.user);
      void queryClient.invalidateQueries();
      onSuccess?.();
    },
  });
  const register = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      signIn(data.accessToken, data.user);
      void queryClient.invalidateQueries();
      onSuccess?.();
    },
  });

  return (
    <div className={`auth-card ${styles.card}`}>
      <h1 className={styles.title}>
        {isRegister ? 'Create an account' : 'Sign in'}
      </h1>
      <nav
        className={`${seg.root} ${seg.centered} ${styles.tabsNav}`}
        aria-label="Authentication mode"
      >
        <button
          type="button"
          className={!isRegister ? seg.tabActive : seg.tab}
          onClick={() => onModeChange('login')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={isRegister ? seg.tabActive : seg.tab}
          onClick={() => onModeChange('register')}
        >
          Register
        </button>
      </nav>

      <div className={`auth-form-slot ${styles.formSlot}`}>
        {isRegister ? (
          <form
            key="register-form"
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              register.mutate({
                email: String(fd.get('email') ?? ''),
                password: String(fd.get('password') ?? ''),
                displayName: String(fd.get('displayName') ?? '').trim(),
              });
            }}
          >
            <label className="field" htmlFor="register-display-name">
              <span>Display name</span>
              <input
                id="register-display-name"
                name="displayName"
                required
                minLength={1}
                maxLength={64}
                className="input"
                autoComplete="nickname"
              />
            </label>
            <label className="field" htmlFor="register-email">
              <span>Email</span>
              <input
                id="register-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="input"
              />
            </label>
            <label className="field" htmlFor="register-password">
              <span>Password</span>
              <input
                id="register-password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                className="input"
              />
            </label>
            {register.isError && (
              <p className="error" role="alert">
                {register.error instanceof ApiError
                  ? register.error.message
                  : register.error instanceof Error
                    ? register.error.message
                    : 'Registration failed'}
              </p>
            )}
            <button
              type="submit"
              className="button"
              disabled={register.isPending}
            >
              {register.isPending ? 'Creating account…' : 'Register'}
            </button>
          </form>
        ) : (
          <form
            key="login-form"
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              login.mutate({
                email: String(fd.get('email') ?? ''),
                password: String(fd.get('password') ?? ''),
              });
            }}
          >
            <label className="field" htmlFor="login-email">
              <span>Email</span>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="input"
              />
            </label>
            <label className="field" htmlFor="login-password">
              <span>Password</span>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
              />
            </label>
            {login.isError && (
              <p className="error" role="alert">
                {login.error instanceof ApiError
                  ? login.error.message
                  : login.error instanceof Error
                    ? login.error.message
                    : 'Sign in failed'}
              </p>
            )}
            <button type="submit" className="button" disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => {
                window.location.href = `${getApiBaseUrl()}/auth/google`;
              }}
            >
              Continue with Google
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
