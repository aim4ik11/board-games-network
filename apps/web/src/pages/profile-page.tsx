import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { patchProfile } from '../api/auth';
import { fetchPublicProfileSummary } from '../api/users';
import { PublicProfileOverview } from '../components/public-profile-overview';
import { useAuthMe } from '../hooks/use-auth-me';
import { gamesListSearchDefault } from '../lib/games-route-defaults';
import { queryKeys } from '../lib/query-keys';

export function ProfilePage() {
  const me = useAuthMe();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const save = useMutation({
    mutationFn: patchProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me, user);
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.users.public(user.id), 'summary'],
      });
      setIsEditing(false);
    },
  });

  const profileSummaryQuery = useQuery({
    queryKey:
      me.data != null
        ? ([...queryKeys.users.public(me.data.id), 'summary'] as const)
        : ['users', 'public', 'me', 'summary'],
    queryFn: () => fetchPublicProfileSummary(me.data!.id),
    enabled: me.data !== undefined,
  });

  if (me.isLoading || me.data === undefined) {
    return (
      <section className="page narrow">
        <p>Loading…</p>
      </section>
    );
  }

  const user = me.data;

  return (
    <section className="page profile-dashboard">
      <h1>Your profile</h1>
      <p className="muted profile-dashboard-subhead">
        <Link
          to="/u/$userId"
          params={{ userId: user.id }}
          className="text-link"
        >
          View public profile
        </Link>
      </p>

      <div className="profile-grid">
        {profileSummaryQuery.isLoading && <p>Loading…</p>}
        {profileSummaryQuery.isError && (
          <p className="error" role="alert">
            {profileSummaryQuery.error instanceof Error
              ? profileSummaryQuery.error.message
              : 'Failed to load profile'}
          </p>
        )}
        {profileSummaryQuery.data && (
          <PublicProfileOverview
            summary={profileSummaryQuery.data}
            headerAction={
              <button
                type="button"
                className="button ghost"
                onClick={() => setIsEditing((v) => !v)}
              >
                {isEditing ? 'Close edit' : 'Edit profile'}
              </button>
            }
          />
        )}

        {isEditing && (
          <aside className="profile-panel profile-edit-panel">
            <h2 className="h-aside">Edit profile</h2>
            <form
              className="stack-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                save.mutate({
                  displayName: String(fd.get('displayName') ?? '').trim(),
                  bio: String(fd.get('bio') ?? ''),
                  city: String(fd.get('city') ?? ''),
                  avatarUrl: String(fd.get('avatarUrl') ?? ''),
                });
              }}
            >
              <label className="field">
                <span>Display name</span>
                <input
                  name="displayName"
                  required
                  minLength={1}
                  maxLength={64}
                  className="input"
                  defaultValue={user.displayName}
                />
              </label>
              <label className="field">
                <span>Bio</span>
                <textarea
                  name="bio"
                  rows={4}
                  maxLength={500}
                  className="input textarea"
                  defaultValue={user.bio ?? ''}
                />
              </label>
              <label className="field">
                <span>City</span>
                <input
                  name="city"
                  maxLength={120}
                  className="input"
                  defaultValue={user.city ?? ''}
                />
              </label>
              <label className="field">
                <span>Avatar URL</span>
                <input
                  name="avatarUrl"
                  type="url"
                  maxLength={2048}
                  className="input"
                  placeholder="https://…"
                  defaultValue={user.avatarUrl ?? ''}
                />
              </label>
              {save.isError && (
                <p className="error" role="alert">
                  {save.error instanceof Error
                    ? save.error.message
                    : 'Save failed'}
                </p>
              )}
              <div className="button-row">
                <button
                  type="submit"
                  className="button"
                  disabled={save.isPending}
                >
                  {save.isPending ? 'Saving…' : 'Save'}
                </button>
                <Link
                  to="/games"
                  search={gamesListSearchDefault}
                  className="button ghost"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </aside>
        )}
      </div>
    </section>
  );
}
