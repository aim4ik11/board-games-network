import { Module } from '@nestjs/common';
import { MediaApplicationService } from './application/media.application.service';
import { S3MediaStorageService } from './infrastructure/storage/s3-media-storage.service';
import { MediaController } from './presentation/http/media.controller';

@Module({
  controllers: [MediaController],
  providers: [MediaApplicationService, S3MediaStorageService],
  exports: [MediaApplicationService],
})
export class MediaModule {}
