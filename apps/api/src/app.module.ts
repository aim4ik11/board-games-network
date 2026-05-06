import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppApplicationService } from './app/application/app.application.service';
import { AppController } from './app/presentation/http/app.controller';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { JwtAuthGuard } from './auth/presentation/http/guards/jwt-auth.guard';
import { CollectionsModule } from './collections/collections.module';
import { FriendsModule } from './friends/friends.module';
import { GamesModule } from './games/games.module';
import { MeetupsModule } from './meetups/meetups.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    AuthModule,
    GamesModule,
    CollectionsModule,
    FriendsModule,
    ChatModule,
    MeetupsModule,
  ],
  controllers: [AppController],
  providers: [
    AppApplicationService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
