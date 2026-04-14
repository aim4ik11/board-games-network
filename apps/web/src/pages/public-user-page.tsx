import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { fetchPublicUser } from '../api/users';
import { queryKeys } from '../lib/query-keys';

const routeApi = getRouteApi('/u/$userId');

export function PublicUserPage() {
  const { userId } = routeApi.useParams();

  const profileQuery = useQuery({
    queryKey: queryKeys.users.public(userId),
    queryFn: () => fetchPublicUser(userId),
  });

  if (profileQuery.isLoading) {
    return (
      <section className="page">
        <p>Loading…</p>
      </section>
    );
  }

  if (profileQuery.isError || profileQuery.data === undefined) {
    return (
      <section className="page">
        <p className="error" role="alert">
          {profileQuery.error instanceof Error
            ? profileQuery.error.message
            : 'User not found'}
        </p>
        <Link to="/" className="text-link">
          ← Home
        </Link>
      </section>
    );
  }

  const p = profileQuery.data;

  return (
    <section className="page profile-public">
      <p className="back">
        <Link to="/" className="text-link">
          ← Home
        </Link>
      </p>
      <div className="profile-public-head">
        {p.avatarUrl ? (
          <img src={p.avatarUrl} alt="" className="profile-avatar" />
        ) : (
          <div className="profile-avatar placeholder" aria-hidden />
        )}
        <div>
          <h1>{p.displayName}</h1>
          {p.city && <p className="muted">{p.city}</p>}
        </div>
      </div>
      {p.bio && <div className="prose">{p.bio}</div>}
    </section>
  );
}
