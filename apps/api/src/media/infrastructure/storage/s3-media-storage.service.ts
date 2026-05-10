import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  MediaImageFolder,
  UploadedMedia,
} from '../../domain/types/media.types';

const MAX_DEFAULT_AVATAR_COUNT = 50;

@Injectable()
export class S3MediaStorageService {
  private readonly bucket: string;
  private readonly defaultAvatarPrefix: string;
  private readonly defaultAvatarCount: number;
  private readonly defaultAvatarExtension: string;
  private readonly region: string;
  private readonly s3: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME');
    this.defaultAvatarPrefix = 'default-avatars';
    this.defaultAvatarCount = 8;
    this.defaultAvatarExtension = 'png';
    this.region = this.configService.get<string>('AWS_REGION', 'eu-north-1');

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async uploadImage(params: {
    folder: MediaImageFolder;
    bytes: Buffer;
    contentType: string;
    originalName: string;
    ownerId?: string;
  }): Promise<UploadedMedia> {
    const key = this.buildObjectKey({
      folder: params.folder,
      originalName: params.originalName,
      ownerId: params.ownerId,
    });

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.bytes,
        ContentType: params.contentType,
      }),
    );

    return {
      key,
      url: this.buildPublicUrl(key),
      contentType: params.contentType,
      sizeBytes: params.bytes.byteLength,
    };
  }

  resolveDefaultAvatarUrl(seed: string): string {
    const effectiveCount = this.getValidatedDefaultAvatarCount();
    const index = this.hashToRange(seed, effectiveCount) + 1;
    const key = `${this.defaultAvatarPrefix}/${index}.${this.defaultAvatarExtension}`;
    return this.buildPublicUrl(key);
  }

  private buildObjectKey(params: {
    folder: MediaImageFolder;
    originalName: string;
    ownerId?: string;
  }): string {
    const ext = this.extractExtension(params.originalName);
    const ownerPart = params.ownerId ? `${params.ownerId}/` : '';
    const stamp = Date.now();
    const random = Math.random().toString(36).slice(2, 10);
    return `${params.folder}/${ownerPart}${stamp}-${random}.${ext}`;
  }

  private extractExtension(fileName: string): string {
    const parts = fileName.split('.');
    const ext = parts.length > 1 ? parts.pop() : null;
    const normalized = (ext ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized.length > 0 ? normalized : 'bin';
  }

  private buildPublicUrl(key: string): string {
    if (this.region === 'us-east-1') {
      return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private getValidatedDefaultAvatarCount(): number {
    if (
      Number.isFinite(this.defaultAvatarCount) &&
      this.defaultAvatarCount >= 1 &&
      this.defaultAvatarCount <= MAX_DEFAULT_AVATAR_COUNT
    ) {
      return this.defaultAvatarCount;
    }
    return 8;
  }

  private hashToRange(seed: string, mod: number): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % mod;
  }
}
