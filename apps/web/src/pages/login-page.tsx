import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { loginRequest, registerRequest } from "../api/auth";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/use-auth";
import { gamesListSearchDefault } from "../lib/games-route-defaults";

const routeApi = getRouteApi("/login");

export function LoginPage() {
  const { signIn } = useAuth();
  const queryClient = useQueryClient();
  const navigate = routeApi.useNavigate();
  const { mode } = routeApi.useSearch();
  const isRegister = mode === "register";

  const login = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      signIn(data.accessToken, data.user);
      void queryClient.invalidateQueries();
      void navigate({ to: "/games", search: gamesListSearchDefault });
    },
  });
  const register = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      signIn(data.accessToken, data.user);
      void queryClient.invalidateQueries();
      void navigate({ to: "/games", search: gamesListSearchDefault });
    },
  });

  return (
    <section className="page auth-page">
      <div className="auth-card">
        <h1>{isRegister ? "Create an account" : "Sign in"}</h1>
        <nav className="segmented auth-tabs">
          <Link
            to="/login"
            search={{ mode: "login" }}
            className={!isRegister ? "active" : undefined}
          >
            Sign in
          </Link>
          <Link
            to="/login"
            search={{ mode: "register" }}
            className={isRegister ? "active" : undefined}
          >
            Register
          </Link>
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
              <button
                type="submit"
                className="button"
                disabled={login.isPending}
              >
                {login.isPending ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
