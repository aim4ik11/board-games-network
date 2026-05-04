import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MeetupsApplicationService } from './application/meetups.application.service';
import { PrismaPlaySessionsRepository } from './infrastructure/persistence/prisma-play-sessions.repository';
import { MeetupsController } from './presentation/http/meetups.controller';

@Module({
  imports: [PrismaModule, FriendsModule],
  controllers: [MeetupsController],
  providers: [MeetupsApplicationService, PrismaPlaySessionsRepository],
})
export class MeetupsModule {}
