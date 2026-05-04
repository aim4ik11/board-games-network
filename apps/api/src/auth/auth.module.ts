import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthApplicationService } from './application/auth.application.service';
import { BcryptPasswordHasher } from './infrastructure/crypto/bcrypt-password-hasher';
import { JwtAccessTokenIssuer } from './infrastructure/jwt/jwt-access-token-issuer';
import { JwtStrategy } from './infrastructure/passport/jwt.strategy';
import { PrismaAuthUsersRepository } from './infrastructure/persistence/prisma-auth-users.repository';
import { AuthController } from './presentation/http/auth.controller';
import { UsersController } from './presentation/http/users.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const seconds = Number(config.get<string>('JWT_EXPIRES_SEC', '604800'));
        return {
          secret: config.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn:
              Number.isFinite(seconds) && seconds > 0 ? seconds : 604800,
          },
        };
      },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthApplicationService,
    JwtStrategy,
    PrismaAuthUsersRepository,
    BcryptPasswordHasher,
    JwtAccessTokenIssuer,
  ],
  exports: [AuthApplicationService, PrismaAuthUsersRepository, JwtModule],
})
export class AuthModule {}
