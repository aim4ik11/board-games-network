import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GameDetail } from '@boardgame/shared';
import { ImagePlus, MessageSquareQuote, Star, X } from 'lucide-react';
import { useId, useState } from 'react';
import {
  createGameReview,
  deleteGameReview,
  fetchGameReviews,
  upsertGameRating,
  updateGameReview,
} from '../../../../api/games';
import { uploadReviewImage } from '../../../../api/media';
import { Button } from '../../../../components/ui';
import { UserIdentity } from '../../../../components/user-identity';
import { useAuthMe } from '../../../../hooks/use-auth-me';
import { requestAuthModal } from '../../../../lib/auth-modal-intent';
import { queryKeys } from '../../../../lib/query-keys';
import { useAuth } from '../../../../lib/use-auth';
import styles from './game-detail-reviews-panel.module.scss';

const MAX_STARS = 5;
const MAX_REVIEW_IMAGES = 3;
const MAX_REVIEW_IMAGE_BYTES = 5 * 1024 * 1024;

function toFiveStarAverage(score: number | null): number | null {
  if (score == null) {
    return null;
  }
  return Math.min(MAX_STARS, Math.max(0, score));
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  return date.toLocaleDateString();
}

function renderStars(score: number): string {
  const rounded = Math.round(score);
  return '★'.repeat(rounded) + '☆'.repeat(Math.max(0, MAX_STARS - rounded));
}

export function GameDetailReviewsPanel({
  slug,
  game,
  onExpandImage,
}: {
  slug: string;
  game: GameDetail;
  onExpandImage: (url: string) => void;
}) {
  const { token } = useAuth();
  const me = useAuthMe();
  const queryClient = useQueryClient();
  const [draftBody, setDraftBody] = useState('');
  const [draftReviewImageUrls, setDraftReviewImageUrls] = useState<string[] | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draftScore, setDraftScore] = useState<number | null>(null);
  const fileInputId = useId();

  const reviewsQuery = useQuery({
    queryKey: queryKeys.games.reviews(slug, { page: 1, limit: 20 }),
    queryFn: () => fetchGameReviews({ slug, page: 1, limit: 20 }),
  });

  const invalidateGameReviews = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.games.all });
  };

  const createReview = useMutation({
    mutationFn: (payload: { body: string; imageUrls: string[] }) =>
      createGameReview(slug, payload),
    onSuccess: () => {
      setDraftBody('');
      setDraftReviewImageUrls([]);
      invalidateGameReviews();
    },
  });

  const updateReview = useMutation({
    mutationFn: (payload: { body: string; imageUrls: string[] }) =>
      updateGameReview(slug, payload),
    onSuccess: () => {
      setDraftBody('');
      setDraftReviewImageUrls([]);
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

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => uploadReviewImage(file),
  });

  const myUserId = me.data?.id;
  const myReview = reviewsQuery.data?.data.find((item) => item.user.id === myUserId);
  const currentDraft = draftBody || myReview?.body || '';
  const currentReviewImageUrls = draftReviewImageUrls ?? myReview?.imageUrls ?? [];
  const trimmedDraft = currentDraft.trim();
  const hasReviewText = trimmedDraft.length > 0;
  const invalidReviewLength = hasReviewText && trimmedDraft.length < 10;
  const averageStars = toFiveStarAverage(game.averageRating);
  const hasRatings = game.ratingCount > 0 && averageStars != null;
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

  const canAddMoreImages = currentReviewImageUrls.length < MAX_REVIEW_IMAGES;

  const handleImageFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }
    setUploadError(null);
    const existing = currentReviewImageUrls;
    const availableSlots = MAX_REVIEW_IMAGES - existing.length;
    if (availableSlots <= 0) {
      setUploadError(`Only ${MAX_REVIEW_IMAGES} images are allowed.`);
      return;
    }
    const toUpload = files.slice(0, availableSlots);
    for (const file of toUpload) {
      if (file.size > MAX_REVIEW_IMAGE_BYTES) {
        setUploadError('Each image must be 5MB or smaller.');
        continue;
      }
      try {
        const uploaded = await uploadImageMutation.mutateAsync(file);
        setDraftReviewImageUrls((current) => {
          const base = current ?? myReview?.imageUrls ?? [];
          if (base.length >= MAX_REVIEW_IMAGES) {
            return base;
          }
          return [...base, uploaded.url];
        });
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : 'Image upload failed',
        );
      }
    }
  };

  const removeImage = (url: string) => {
    setDraftReviewImageUrls((current) => {
      const base = current ?? myReview?.imageUrls ?? [];
      return base.filter((item) => item !== url);
    });
  };

  return (
    <div className={styles.grid}>
      <div className={styles.mainColumn}>
        {reviewsQuery.isLoading && <p className="muted">Loading reviews…</p>}
        {reviewsQuery.isError && (
          <p className="error" role="alert">
            {reviewsQuery.error instanceof Error
              ? reviewsQuery.error.message
              : 'Failed to load reviews'}
          </p>
        )}

        {reviewsQuery.data && (
          <ul className={styles.reviewList}>
            {reviewsQuery.data.data.length === 0 ? (
              <li className={styles.emptyStateItem}>
                <div className={styles.emptyState} role="status">
                  <div className={styles.emptyIcon} aria-hidden>
                    <MessageSquareQuote size={28} strokeWidth={1.75} />
                  </div>
                  <h4 className={styles.emptyTitle}>No reviews yet</h4>
                  <p className={styles.emptyText}>
                    Nobody has written a review for this game. Share your rating and
                    thoughts to help others decide if it belongs on their table.
                  </p>
                  {!token ? (
                    <button
                      type="button"
                      className={styles.emptyCta}
                      onClick={() => requestAuthModal('login')}
                    >
                      Sign in to write the first review
                    </button>
                  ) : (
                    <p className={styles.emptyHint}>Use the form to get started.</p>
                  )}
                </div>
              </li>
            ) : (
              reviewsQuery.data.data.map((review) => (
                <li key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHead}>
                    <UserIdentity
                      userId={review.user.id}
                      displayName={review.user.displayName}
                      avatarUrl={review.user.avatarUrl}
                      subtitle={`Posted ${formatRelativeDate(review.updatedAt)}`}
                      size="md"
                      layout="inline"
                    />
                  </div>
                  <p className={styles.reviewBody}>{review.body}</p>
                  {review.imageUrls.length > 0 && (
                    <div className={styles.imageGrid}>
                      {review.imageUrls.map((url) => (
                        <button
                          key={url}
                          type="button"
                          className={styles.imageBtn}
                          onClick={() => onExpandImage(url)}
                        >
                          <img src={url} alt="" className={styles.imageThumb} />
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <aside className={styles.sidebarColumn} aria-label="Review sidebar">
        <div className={styles.summaryPanel}>
          <h3 className={styles.summaryTitle}>Rating Summary</h3>
        {hasRatings ? (
          <div className={styles.summaryScoreRow}>
            <div className={styles.summaryScore}>{averageStars.toFixed(1)}</div>
            <div>
              <div className={styles.summaryStars} aria-hidden>
                {renderStars(averageStars)}
              </div>
              <p className={styles.summaryMeta}>
                Based on {game.ratingCount.toLocaleString()} rating
                {game.ratingCount === 1 ? '' : 's'}
                {game.reviewCount > 0 &&
                  ` · ${game.reviewCount.toLocaleString()} review${game.reviewCount === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.summaryEmpty} role="status">
            <div className={styles.summaryEmptyIcon} aria-hidden>
              <Star size={32} strokeWidth={1.5} />
            </div>
            <p className={styles.summaryEmptyTitle}>No ratings yet</p>
            <p className={styles.summaryEmptyText}>
              Be the first to rate this game and help others discover whether it is
              worth a spot on the table.
            </p>
            {!token ? (
              <button
                type="button"
                className={styles.summaryEmptyCta}
                onClick={() => requestAuthModal('login')}
              >
                Sign in to rate
              </button>
            ) : (
              <p className={styles.summaryEmptyHint}>Pick stars in the form below.</p>
            )}
          </div>
        )}
        </div>

        {token ? (
          <form
            className={`${styles.glassPanel} ${styles.writePanel}`}
            onSubmit={async (event) => {
              event.preventDefault();
              if (draftScore == null || invalidReviewLength) {
                return;
              }

              await upsertRating.mutateAsync(draftScore);

              if (hasReviewText) {
                if (myReview) {
                  await updateReview.mutateAsync({
                    body: trimmedDraft,
                    imageUrls: currentReviewImageUrls,
                  });
                } else {
                  await createReview.mutateAsync({
                    body: trimmedDraft,
                    imageUrls: currentReviewImageUrls,
                  });
                }
              }
            }}
          >
            <div className={styles.formHeader}>
              <h3 className={styles.formTitle}>Write a Review</h3>
              <div className={styles.starInput} role="radiogroup" aria-label="Rating">
                {Array.from({ length: MAX_STARS }, (_, index) => index + 1).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={draftScore === value}
                      className={
                        draftScore != null && value <= draftScore
                          ? `${styles.starBtn} ${styles.starBtnSelected}`
                          : styles.starBtn
                      }
                      onClick={() => setDraftScore(value)}
                    >
                      ★
                    </button>
                  ),
                )}
              </div>
            </div>
            <textarea
              className={styles.textarea}
              value={currentDraft}
              onChange={(event) => setDraftBody(event.target.value)}
              minLength={10}
              maxLength={8000}
              placeholder="Share your thoughts on the game..."
            />
            <div className={styles.imageSection}>
              <div className={styles.imageSectionHead}>
                <span className={styles.imageSectionLabel}>Photos</span>
                <span className={styles.imageSectionMeta}>
                  {currentReviewImageUrls.length}/{MAX_REVIEW_IMAGES} · max 5MB
                </span>
              </div>

              <div className={styles.imagePickerRow}>
                {currentReviewImageUrls.map((url) => (
                  <div key={url} className={styles.imagePreview}>
                    <button
                      type="button"
                      className={styles.imagePreviewBtn}
                      onClick={() => onExpandImage(url)}
                    >
                      <img src={url} alt="" className={styles.imageThumb} />
                    </button>
                    <button
                      type="button"
                      className={styles.imageRemoveBtn}
                      onClick={() => removeImage(url)}
                      aria-label="Remove image"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </div>
                ))}

                {canAddMoreImages && (
                  <label
                    htmlFor={fileInputId}
                    className={
                      uploadImageMutation.isPending
                        ? `${styles.imageAddSlot} ${styles.imageAddSlotPending}`
                        : styles.imageAddSlot
                    }
                  >
                    <ImagePlus size={22} aria-hidden className={styles.imageAddIcon} />
                    <span className={styles.imageAddText}>
                      {uploadImageMutation.isPending ? 'Uploading…' : 'Add photo'}
                    </span>
                  </label>
                )}
              </div>

              <input
                id={fileInputId}
                type="file"
                className={styles.fileInputHidden}
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                disabled={uploadImageMutation.isPending || !canAddMoreImages}
                onChange={async (event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.currentTarget.value = '';
                  await handleImageFiles(files);
                }}
              />

              {uploadError && (
                <p className={styles.imageError} role="alert">
                  {uploadError}
                </p>
              )}
            </div>

            {invalidReviewLength && (
              <p className="error" role="alert">
                Review text must be at least 10 characters when provided.
              </p>
            )}
            <div className={styles.formActions}>
              {myReview && (
                <Button
                  type="button"
                  variant="ghost"
                  className="danger"
                  onClick={() => deleteReview.mutate()}
                  disabled={deleteReview.isPending}
                >
                  {deleteReview.isPending ? 'Deleting...' : 'Delete review'}
                </Button>
              )}
              <Button
                type="submit"
                className={styles.submitBtn}
                disabled={submitDisabled}
              >
                {upsertRating.isPending ||
                createReview.isPending ||
                updateReview.isPending
                  ? 'Saving...'
                  : 'Submit Review'}
              </Button>
            </div>
          </form>
        ) : (
          <div className={`${styles.glassPanel} ${styles.writePanel}`}>
            <h3 className={styles.formTitle}>Write a Review</h3>
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
          </div>
        )}

        {reviewActionError instanceof Error && (
          <p className="error" role="alert">
            {reviewActionError.message}
          </p>
        )}

      </aside>
    </div>
  );
}
