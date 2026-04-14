import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '../api/auth';
import { useAuth } from '../lib/use-auth';
import { queryKeys } from '../lib/query-keys';

export function useAuthMe() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchMe,
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
