import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useState } from 'react';
import {
  createGameReview,
  deleteGameReview,
  fetchGameBySlug,
  fetchGameReviews,
  upsertGameRating,
  updateGameReview,
} from '../api/games';
import { GameCollectionActions } from '../components/game-collection-actions';
import { useAuthMe } from '../hooks/use-auth-me';
import { requestAuthModal } from '../lib/auth-modal-intent';
import { queryKeys } from '../lib/query-keys';
import { useAuth } from '../lib/use-auth';

const routeApi = getRouteApi('/games/$slug');
const MAX_STARS = 5;

function toFiveStarAverage(score: number | null): number | null {
  if (score == null) {
    return null;
  }
  return Math.min(MAX_STARS, Math.max(0, score));
}

export function GameDetailPage() {
  const { slug } = routeApi.useParams();
  const { token } = useAuth();
  const me = useAuthMe();
  const queryClient = useQueryClient();
  const [draftBody, setDraftBody] = useState('');
  const [draftScore, setDraftScore] = useState<number | null>(null);

  const gameQuery = useQuery({
    queryKey: queryKeys.games.detail(slug),
    queryFn: () => fetchGameBySlug(slug),
  });
  const reviewsQuery = useQuery({
    queryKey: queryKeys.games.reviews(slug, { page: 1, limit: 20 }),
    queryFn: () => fetchGameReviews({ slug, page: 1, limit: 20 }),
  });

  const invalidateGameReviews = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.games.all });
  };

  const createReview = useMutation({
    mutationFn: (body: string) => createGameReview(slug, { body }),
    onSuccess: () => {
      setDraftBody('');
      invalidateGameReviews();
    },
  });

  const updateReview = useMutation({
    mutationFn: (body: string) => updateGameReview(slug, { body }),
    onSuccess: () => {
      setDraftBody('');
      invalidateGameReviews();
    },
  });

  const deleteReview = useMutation({
    mutationFn: () => deleteGameReview(slug),
    onSuccess: () => {
      setDraftBody('');
      invalidateGameReviews();
    },
  });
  const upsertRating = useMutation({
    mutationFn: (score: number) => upsertGameRating(slug, { score }),
    onSuccess: invalidateGameReviews,
  });

  if (gameQuery.isLoading) {
    return (
      <section className="page">
        <p>Loading…</p>
      </section>
    );
  }

  if (gameQuery.isError) {
    return (
      <section className="page">
        <p className="error" role="alert">
          {gameQuery.error instanceof Error
            ? gameQuery.error.message
            : 'Game not found'}
        </p>
        <p>
          <a href="/games" className="text-link">
            ← Back to catalog
          </a>
        </p>
      </section>
    );
  }

  if (gameQuery.data === undefined) {
    return null;
  }

  const game = gameQuery.data;
  const myUserId = me.data?.id;
  const myReview = reviewsQuery.data?.data.find((item) => item.user.id === myUserId);
  const currentDraft = draftBody || myReview?.body || '';
  const trimmedDraft = currentDraft.trim();
  const hasReviewText = trimmedDraft.length > 0;
  const invalidReviewLength = hasReviewText && trimmedDraft.length < 10;
  const averageStars = toFiveStarAverage(game.averageRating);
  const submitDisabled =
    draftScore == null ||
    invalidReviewLength ||
    createReview.isPending ||
    updateReview.isPending ||
    deleteReview.isPending ||
    upsertRating.isPending;
  const reviewActionError =
    createReview.error ??
    updateReview.error ??
    deleteReview.error ??
    upsertRating.error;

  return (
    <article className="page game-detail">
      <p className="back">
        <a href="/games" className="text-link">
          ← Catalog
        </a>
      </p>
      <div className="game-detail-head">
        {game.imageUrl ? (
          <img src={game.imageUrl} alt="" className="game-hero" />
        ) : (
          <div className="game-hero placeholder" aria-hidden />
        )}
        <div>
          <h1>{game.title}</h1>
          <dl className="game-meta">
            {game.yearPublished != null && (
              <>
                <dt>Year</dt>
                <dd>{game.yearPublished}</dd>
              </>
            )}
            {(game.minPlayers != null || game.maxPlayers != null) && (
              <>
                <dt>Players</dt>
                <dd>
                  {game.minPlayers ?? '?'}–{game.maxPlayers ?? '?'}
                </dd>
              </>
            )}
            {game.playTimeMin != null && (
              <>
                <dt>Play time</dt>
                <dd>{game.playTimeMin}+ min</dd>
              </>
            )}
          </dl>
          <p className="muted">
            {game.ratingCount > 0 && game.averageRating != null ? (
              <>
                Avg rating{' '}
                <strong>
                  {averageStars?.toFixed(1)} / {MAX_STARS}
                </strong>{' '}
                <span aria-hidden>{'★'.repeat(Math.round(averageStars ?? 0))}</span>
                ({game.ratingCount}{' '}
                {game.ratingCount === 1 ? 'rating' : 'ratings'})
              </>
            ) : (
              <>No ratings yet</>
            )}
            {' · '}
            {game.reviewCount} {game.reviewCount === 1 ? 'review' : 'reviews'}
          </p>
          <div className="game-collection-block">
            <h2 className="h-aside">Collection</h2>
            <GameCollectionActions slug={game.slug} />
          </div>
        </div>
      </div>
      {game.description && (
        <div className="prose">
          {game.description.split('\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}
      <section className="game-reviews">
        <h2 className="h-aside">Reviews</h2>
        {token ? (
          <form
            className="stack-form game-review-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (draftScore == null || invalidReviewLength) {
                return;
              }

              await upsertRating.mutateAsync(draftScore);

              if (hasReviewText) {
                if (myReview) {
                  await updateReview.mutateAsync(trimmedDraft);
                } else {
                  await createReview.mutateAsync(trimmedDraft);
                }
              }
            }}
          >
            <label className="field">
              <span>
                {myReview
                  ? 'Edit your review (optional)'
                  : 'Leave a review (optional)'}
              </span>
              <textarea
                className="input textarea"
                value={currentDraft}
                onChange={(event) => setDraftBody(event.target.value)}
                minLength={10}
                maxLength={8000}
                placeholder="Share what you liked, disliked, and who this game is for."
              />
            </label>
            <label className="field">
              <span>Rating (required)</span>
              <div className="star-rating-input" role="radiogroup" aria-label="Rating">
                {Array.from({ length: MAX_STARS }, (_, index) => index + 1).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={draftScore === value}
                      className={
                        draftScore != null && value <= draftScore
                          ? 'star-rating-star is-selected'
                          : 'star-rating-star'
                      }
                      onClick={() => setDraftScore(value)}
                    >
                      ★
                    </button>
                  ),
                )}
              </div>
              <span className="muted">
                {draftScore == null ? 'Choose 1 to 5 stars.' : `${draftScore} / 5`}
              </span>
            </label>
            {invalidReviewLength && (
              <p className="error" role="alert">
                Review text must be at least 10 characters when provided.
              </p>
            )}
            <div className="button-row">
              <button type="submit" className="button" disabled={submitDisabled}>
                {upsertRating.isPending ||
                createReview.isPending ||
                updateReview.isPending
                  ? 'Saving...'
                  : 'Save rating'}
              </button>
              {myReview && (
                <button
                  type="button"
                  className="button ghost danger"
                  onClick={() => deleteReview.mutate()}
                  disabled={deleteReview.isPending}
                >
                  {deleteReview.isPending ? 'Deleting...' : 'Delete review'}
                </button>
              )}
            </div>
          </form>
        ) : (
          <p className="muted">
            <button
              type="button"
              className="link-button text-link"
              onClick={() => requestAuthModal('login')}
            >
              Sign in
            </button>{' '}
            to leave a review.
          </p>
        )}
        {reviewActionError instanceof Error && (
          <p className="error" role="alert">
            {reviewActionError.message}
          </p>
        )}
        {reviewsQuery.isLoading && <p className="muted">Loading reviews…</p>}
        {reviewsQuery.isError && (
          <p className="error" role="alert">
            {reviewsQuery.error instanceof Error
              ? reviewsQuery.error.message
              : 'Failed to load reviews'}
          </p>
        )}
        {reviewsQuery.data && (
          <ul className="game-review-list">
            {reviewsQuery.data.data.length === 0 ? (
              <li className="muted">No reviews yet. Be the first to share one.</li>
            ) : (
              reviewsQuery.data.data.map((review) => (
                <li key={review.id} className="game-review-item">
                  <div className="game-review-head">
                    <strong>{review.user.displayName}</strong>
                    <span className="muted">
                      {new Date(review.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p>{review.body}</p>
                </li>
              ))
            )}
          </ul>
        )}
      </section>
    </article>
  );
}
