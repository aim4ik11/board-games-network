import { Injectable } from '@nestjs/common';
import type { UploadedMedia } from '../domain/types/media.types';
import { S3MediaStorageService } from '../infrastructure/storage/s3-media-storage.service';

@Injectable()
export class MediaApplicationService {
  constructor(private readonly mediaStorageService: S3MediaStorageService) {}

  uploadBoardGamePhoto(params: {
    bytes: Buffer;
    contentType: string;
    originalName: string;
  }): Promise<UploadedMedia> {
    return this.mediaStorageService.uploadImage({
      folder: 'game-photos',
      ...params,
    });
  }

  uploadUserAvatar(params: {
    userId: string;
    bytes: Buffer;
    contentType: string;
    originalName: string;
  }): Promise<UploadedMedia> {
    return this.mediaStorageService.uploadImage({
      folder: 'avatars',
      ownerId: params.userId,
      bytes: params.bytes,
      contentType: params.contentType,
      originalName: params.originalName,
    });
  }

  uploadReviewPhoto(params: {
    userId: string;
    bytes: Buffer;
    contentType: string;
    originalName: string;
  }): Promise<UploadedMedia> {
    return this.mediaStorageService.uploadImage({
      folder: 'review-images',
      ownerId: params.userId,
      bytes: params.bytes,
      contentType: params.contentType,
      originalName: params.originalName,
    });
  }

  getDefaultAvatarUrl(seed: string): string {
    return this.mediaStorageService.resolveDefaultAvatarUrl(seed);
  }
}
