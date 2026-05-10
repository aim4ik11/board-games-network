import type { UploadedMedia } from '@boardgame/shared';
import { apiFetch } from '../lib/api';

export async function uploadReviewImage(file: File): Promise<UploadedMedia> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<UploadedMedia>('/media/upload/review-photo', {
    method: 'POST',
    body: formData,
  });
}
