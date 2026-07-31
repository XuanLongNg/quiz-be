import { MailModule } from '@base/mail/mail.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenCron } from './crons/token.cron';

import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { Account } from './entities/auth.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    PassportModule,
    MailModule,
    TypeOrmModule.forFeature([Account]),
    JwtModule.register({
      secret: configs.JWT_SECRET,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      signOptions: { expiresIn: configs.JWT_EXPIRATION_TIME as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenCron, JwtStrategy, JwtUtils, LocalStrategy],
  exports: [AuthService, JwtUtils],
})
export class AuthModule {}
