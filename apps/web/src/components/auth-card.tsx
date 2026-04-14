import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginRequest, registerRequest } from "../api/auth";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/use-auth";

export type AuthMode = "login" | "register";

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
  const isRegister = mode === "register";

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
    <div className="auth-card">
      <h1>{isRegister ? "Create an account" : "Sign in"}</h1>
      <nav className="segmented auth-tabs">
        <button
          type="button"
          className={!isRegister ? "active" : undefined}
          onClick={() => onModeChange("login")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={isRegister ? "active" : undefined}
          onClick={() => onModeChange("register")}
        >
          Register
        </button>
      </nav>

      <div className="auth-form-slot">
        {isRegister ? (
          <form
            key="register-form"
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              register.mutate({
                email: String(fd.get("email") ?? ""),
                password: String(fd.get("password") ?? ""),
                displayName: String(fd.get("displayName") ?? "").trim(),
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
                    : "Registration failed"}
              </p>
            )}
            <button
              type="submit"
              className="button"
              disabled={register.isPending}
            >
              {register.isPending ? "Creating account…" : "Register"}
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
                email: String(fd.get("email") ?? ""),
                password: String(fd.get("password") ?? ""),
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
                    : "Sign in failed"}
              </p>
            )}
            <button type="submit" className="button" disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
