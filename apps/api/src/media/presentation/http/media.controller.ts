import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@boardgame/shared';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../../auth/presentation/http/decorators/current-user.decorator';
import { Public } from '../../../auth/presentation/http/decorators/public.decorator';
import { MediaApplicationService } from '../../application/media.application.service';
import { DefaultAvatarDto } from './dto/default-avatar.dto';

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_REVIEW_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

type UploadFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaApplicationService: MediaApplicationService,
  ) {}

  @Post('upload/board-game-photo')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload board game photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadBoardGamePhoto(@UploadedFile() file: UploadFile) {
    this.validateImageFile(file);
    return this.mediaApplicationService.uploadBoardGamePhoto({
      bytes: file.buffer,
      contentType: file.mimetype,
      originalName: file.originalname,
    });
  }

  @Post('upload/user-avatar')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload avatar for current user' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadUserAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadFile,
  ) {
    this.validateImageFile(file);
    return this.mediaApplicationService.uploadUserAvatar({
      userId: user.id,
      bytes: file.buffer,
      contentType: file.mimetype,
      originalName: file.originalname,
    });
  }

  @Post('upload/review-photo')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload review photo for current user' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadReviewPhoto(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadFile,
  ) {
    this.validateImageFile(file, MAX_REVIEW_IMAGE_SIZE_BYTES);
    return this.mediaApplicationService.uploadReviewPhoto({
      userId: user.id,
      bytes: file.buffer,
      contentType: file.mimetype,
      originalName: file.originalname,
    });
  }

  @Public()
  @Post('default-avatar')
  @ApiOperation({ summary: 'Resolve default avatar URL by seed' })
  getDefaultAvatar(@Body() dto: DefaultAvatarDto) {
    return {
      url: this.mediaApplicationService.getDefaultAvatarUrl(dto.seed),
    };
  }

  private validateImageFile(
    file: UploadFile | undefined,
    maxSizeBytes = MAX_FILE_SIZE_BYTES,
  ): void {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only image uploads are supported');
    }
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `Image is too large (max ${Math.floor(maxSizeBytes / (1024 * 1024))}MB)`,
      );
    }
  }
}
