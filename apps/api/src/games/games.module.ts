import { Module } from '@nestjs/common';
import { GamesApplicationService } from './application/games.application.service';
import { BoardGamesRepositoryPort } from './domain/ports/board-games.repository.port';
import { GameRatingsRepositoryPort } from './domain/ports/game-ratings.repository.port';
import { GameReviewsRepositoryPort } from './domain/ports/game-reviews.repository.port';
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
    {
      provide: BoardGamesRepositoryPort,
      useClass: PrismaBoardGamesRepository,
    },
    {
      provide: GameReviewsRepositoryPort,
      useClass: PrismaGameReviewsRepository,
    },
    {
      provide: GameRatingsRepositoryPort,
      useClass: PrismaGameRatingsRepository,
    },
  ],
  exports: [GamesApplicationService, BoardGamesRepositoryPort],
})
export class GamesModule {}
