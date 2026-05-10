import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MediaModule } from '../media/media.module';
import { AuthApplicationService } from './application/auth.application.service';
import { WsSocketAuthService } from './application/ws-socket-auth.service';
import { BcryptPasswordHasher } from './infrastructure/crypto/bcrypt-password-hasher';
import { Sha256HasherService } from './infrastructure/crypto/sha256-hasher.service';
import { JwtAccessTokenIssuer } from './infrastructure/jwt/jwt-access-token-issuer';
import { GoogleStrategy } from './infrastructure/passport/google.strategy';
import { JwtStrategy } from './infrastructure/passport/jwt.strategy';
import { PrismaAuthSessionsRepository } from './infrastructure/persistence/prisma-auth-sessions.repository';
import { PrismaAuthUsersRepository } from './infrastructure/persistence/prisma-auth-users.repository';
import { AuthCookieService } from './infrastructure/tokens/auth-cookie.service';
import { RefreshTokenService } from './infrastructure/tokens/refresh-token.service';
import { AuthController } from './presentation/http/auth.controller';
import { UsersController } from './presentation/http/users.controller';

@Module({
  imports: [
    MediaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const seconds = Number(config.get<string>('JWT_EXPIRES_SEC', '900'));
        return {
          secret: config.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: Number.isFinite(seconds) && seconds > 0 ? seconds : 900,
          },
        };
      },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthApplicationService,
    WsSocketAuthService,
    JwtStrategy,
    GoogleStrategy,
    PrismaAuthUsersRepository,
    PrismaAuthSessionsRepository,
    BcryptPasswordHasher,
    Sha256HasherService,
    JwtAccessTokenIssuer,
    RefreshTokenService,
    AuthCookieService,
  ],
  exports: [
    AuthApplicationService,
    PrismaAuthUsersRepository,
    JwtModule,
    WsSocketAuthService,
  ],
})
export class AuthModule {}
