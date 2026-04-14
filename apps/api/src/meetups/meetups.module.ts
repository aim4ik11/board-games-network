import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MeetupsApplicationService } from './application/meetups.application.service';
import { PlaySessionsRepositoryPort } from './domain/ports/play-sessions.repository.port';
import { PrismaPlaySessionsRepository } from './infrastructure/persistence/prisma-play-sessions.repository';
import { MeetupsController } from './presentation/http/meetups.controller';

@Module({
  imports: [PrismaModule, FriendsModule],
  controllers: [MeetupsController],
  providers: [
    MeetupsApplicationService,
    {
      provide: PlaySessionsRepositoryPort,
      useClass: PrismaPlaySessionsRepository,
    },
  ],
})
export class MeetupsModule {}
