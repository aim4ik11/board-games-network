import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addToCollection,
  fetchCollectionEntry,
  removeFromCollection,
} from '../api/collection';
import type { CollectionStatus } from '../api/types';
import { requestAuthModal } from '../lib/auth-modal-intent';
import { queryKeys } from '../lib/query-keys';
import { useAuth } from '../lib/use-auth';

const STATUS_LABEL: Record<CollectionStatus, string> = {
  OWNED: 'Owned',
  WISHLIST: 'Wishlist',
  PREVIOUSLY_OWNED: 'Previously owned',
};

function invalidateCollection(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.collection.all });
}

export function GameCollectionActions({ slug }: { slug: string }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const entryQuery = useQuery({
    queryKey: queryKeys.collection.entry(slug),
    queryFn: () => fetchCollectionEntry(slug),
    enabled: Boolean(token),
  });

  const addOrUpdate = useMutation({
    mutationFn: (status: CollectionStatus) => addToCollection({ slug, status }),
    onSuccess: () => invalidateCollection(queryClient),
  });

  const remove = useMutation({
    mutationFn: () => removeFromCollection(slug),
    onSuccess: () => invalidateCollection(queryClient),
  });

  if (!token) {
    return (
      <p className="muted">
        <button
          type="button"
          className="link-button text-link"
          onClick={() => requestAuthModal('login')}
        >
          Sign in
        </button>{' '}
        to add this game to your collection.
      </p>
    );
  }

  if (entryQuery.isLoading) {
    return <p className="muted">Loading your collection…</p>;
  }

  if (entryQuery.isError) {
    return (
      <p className="error" role="alert">
        Could not load collection status.
      </p>
    );
  }

  const entry = entryQuery.data;

  if (!entry) {
    return (
      <div className="collection-actions">
        <span className="muted">Add to collection</span>
        <div className="button-row">
          <button
            type="button"
            className="button small"
            disabled={addOrUpdate.isPending}
            onClick={() => addOrUpdate.mutate('OWNED')}
          >
            Owned
          </button>
          <button
            type="button"
            className="button small"
            disabled={addOrUpdate.isPending}
            onClick={() => addOrUpdate.mutate('WISHLIST')}
          >
            Wishlist
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="collection-actions">
      <p>
        <span className="muted">In your collection:</span>{' '}
        <strong>{STATUS_LABEL[entry.status]}</strong>
      </p>
      <div className="button-row wrap">
        <button
          type="button"
          className="button small ghost"
          disabled={addOrUpdate.isPending}
          onClick={() => addOrUpdate.mutate('OWNED')}
        >
          Owned
        </button>
        <button
          type="button"
          className="button small ghost"
          disabled={addOrUpdate.isPending}
          onClick={() => addOrUpdate.mutate('WISHLIST')}
        >
          Wishlist
        </button>
        <button
          type="button"
          className="button small ghost"
          disabled={addOrUpdate.isPending}
          onClick={() => addOrUpdate.mutate('PREVIOUSLY_OWNED')}
        >
          Previously owned
        </button>
        <button
          type="button"
          className="button small danger"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
