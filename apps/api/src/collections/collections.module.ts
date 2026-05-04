import { Module } from '@nestjs/common';
import { GamesModule } from '../games/games.module';
import { CollectionsApplicationService } from './application/collections.application.service';
import { PrismaUserGamesRepository } from './infrastructure/persistence/prisma-user-games.repository';
import { CollectionsController } from './presentation/http/collections.controller';

@Module({
  imports: [GamesModule],
  controllers: [CollectionsController],
  providers: [CollectionsApplicationService, PrismaUserGamesRepository],
})
export class CollectionsModule {}
