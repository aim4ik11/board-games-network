import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { registerRequest } from '../api/auth';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/use-auth';
import { gamesListSearchDefault } from '../lib/games-route-defaults';

const routeApi = getRouteApi('/register');

export function RegisterPage() {
  const { signIn } = useAuth();
  const queryClient = useQueryClient();
  const navigate = routeApi.useNavigate();

  const register = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      signIn(data.accessToken, data.user);
      void queryClient.invalidateQueries();
      void navigate({ to: '/games', search: gamesListSearchDefault });
    },
  });

  return (
    <section className="page narrow">
      <h1>Create an account</h1>
      <form
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
        <label className="field">
          <span>Display name</span>
          <input name="displayName" required minLength={1} maxLength={64} className="input" />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" required autoComplete="email" className="input" />
        </label>
        <label className="field">
          <span>Password</span>
          <input
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
        <button type="submit" className="button" disabled={register.isPending}>
          {register.isPending ? 'Creating account…' : 'Register'}
        </button>
      </form>
    </section>
  );
}
