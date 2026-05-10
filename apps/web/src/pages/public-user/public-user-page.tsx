import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { fetchPublicProfileSummary } from '../../api/users';
import { PublicProfileOverview } from '../../components/public-profile-overview';
import { queryKeys } from '../../lib/query-keys';
import styles from './public-user-page.module.scss';

const routeApi = getRouteApi('/u/$userId');

export function PublicUserPage() {
  const { userId } = routeApi.useParams();

  const profileQuery = useQuery({
    queryKey: queryKeys.users.summary(userId),
    queryFn: () => fetchPublicProfileSummary(userId),
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

  return (
    <section className={`page profile-dashboard ${styles.dashboard}`}>
      <p className="back">
        <Link to="/" className="text-link">
          ← Home
        </Link>
      </p>
      <div className="profile-grid profile-grid-single">
        <PublicProfileOverview summary={profileQuery.data} />
      </div>
    </section>
  );
}
