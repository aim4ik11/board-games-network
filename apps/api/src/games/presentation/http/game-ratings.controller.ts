import { Body, Controller, Delete, Param, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@boardgame/shared';
import { CurrentUser } from '../../../auth/presentation/http/decorators/current-user.decorator';
import { GamesApplicationService } from '../../application/games.application.service';
import { UpsertRatingDto } from './dto/upsert-rating.dto';

@ApiTags('ratings')
@Controller('games/:slug/ratings')
export class GameRatingsController {
  constructor(
    private readonly gamesApplicationService: GamesApplicationService,
  ) {}

  @Put()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Set or update your 1–5 rating' })
  @ApiParam({ name: 'slug' })
  upsert(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertRatingDto,
  ) {
    return this.gamesApplicationService.upsertRating(slug, user, dto.score);
  }

  @Delete()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove your rating' })
  @ApiParam({ name: 'slug' })
  remove(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.gamesApplicationService.deleteRating(slug, user);
  }
}
