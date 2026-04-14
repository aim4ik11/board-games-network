import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FriendsApplicationService } from './application/friends.application.service';
import { FriendshipsRepositoryPort } from './domain/ports/friendships.repository.port';
import { PrismaFriendshipsRepository } from './infrastructure/persistence/prisma-friendships.repository';
import { FriendsController } from './presentation/http/friends.controller';

@Module({
  imports: [AuthModule],
  controllers: [FriendsController],
  providers: [
    FriendsApplicationService,
    {
      provide: FriendshipsRepositoryPort,
      useClass: PrismaFriendshipsRepository,
    },
  ],
  exports: [FriendsApplicationService],
})
export class FriendsModule {}
