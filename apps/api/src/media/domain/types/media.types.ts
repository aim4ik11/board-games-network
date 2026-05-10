export const MEDIA_IMAGE_FOLDERS = [
  'game-photos',
  'avatars',
  'review-images',
  'default-avatars',
] as const;

export type MediaImageFolder = (typeof MEDIA_IMAGE_FOLDERS)[number];
export type UploadedMedia = {
  key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
};
