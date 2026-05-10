import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@boardgame/shared';
import { CurrentUser } from '../../../auth/presentation/http/decorators/current-user.decorator';
import { Public } from '../../../auth/presentation/http/decorators/public.decorator';
import { GamesApplicationService } from '../../application/games.application.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@ApiTags('reviews')
@Controller('games/:slug/reviews')
export class GameReviewsController {
  constructor(
    private readonly gamesApplicationService: GamesApplicationService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List reviews for a game' })
  @ApiParam({ name: 'slug' })
  list(@Param('slug') slug: string, @Query() query: QueryReviewsDto) {
    return this.gamesApplicationService.listReviews({
      slug,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create your review (one per game)' })
  @ApiParam({ name: 'slug' })
  create(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.gamesApplicationService.createReview(
      slug,
      user,
      dto.body.trim(),
      (dto.imageUrls ?? []).map((url) => url.trim()),
    );
  }

  @Patch()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update your review' })
  @ApiParam({ name: 'slug' })
  update(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.gamesApplicationService.updateReview(
      slug,
      user,
      dto.body.trim(),
      (dto.imageUrls ?? []).map((url) => url.trim()),
    );
  }

  @Delete()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete your review' })
  @ApiParam({ name: 'slug' })
  remove(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.gamesApplicationService.deleteReview(slug, user);
  }
}
