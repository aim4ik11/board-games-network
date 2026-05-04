import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FriendsApplicationService } from './application/friends.application.service';
import { PrismaFriendshipsRepository } from './infrastructure/persistence/prisma-friendships.repository';
import { FriendsController } from './presentation/http/friends.controller';

@Module({
  imports: [AuthModule],
  controllers: [FriendsController],
  providers: [FriendsApplicationService, PrismaFriendshipsRepository],
  exports: [FriendsApplicationService],
})
export class FriendsModule {}
