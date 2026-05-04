import { Module } from '@nestjs/common';
import { GamesApplicationService } from './application/games.application.service';
import { PrismaBoardGamesRepository } from './infrastructure/persistence/prisma-board-games.repository';
import { PrismaGameRatingsRepository } from './infrastructure/persistence/prisma-game-ratings.repository';
import { PrismaGameReviewsRepository } from './infrastructure/persistence/prisma-game-reviews.repository';
import { GameRatingsController } from './presentation/http/game-ratings.controller';
import { GameReviewsController } from './presentation/http/game-reviews.controller';
import { GamesController } from './presentation/http/games.controller';

@Module({
  controllers: [GamesController, GameReviewsController, GameRatingsController],
  providers: [
    GamesApplicationService,
    PrismaBoardGamesRepository,
    PrismaGameReviewsRepository,
    PrismaGameRatingsRepository,
  ],
  exports: [GamesApplicationService, PrismaBoardGamesRepository],
})
export class GamesModule {}
