import { ConfigModule } from '@base/configs/config.module';
import { DatabaseModule } from '@base/database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
// TODO: enable when these modules are ported
// import { AuthModule } from '@modules/auth/auth.module';
// import { ServicesModule } from '@modules/services/services.module';
// import { UsersModule } from '@modules/users/users.module';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import {
  AcceptLanguageResolver,
  I18nJsonLoader,
  I18nModule,
} from 'nestjs-i18n';
import { join } from 'path';
import { AppController } from './app.controller';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    I18nModule.forRoot({
      fallbackLanguage: 'vi',
      loader: I18nJsonLoader,
      loaderOptions: {
        path: join(__dirname, 'i18n'),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
      logging: true,
    }),
    DatabaseModule,
    AuditLogsModule,
    // TODO: enable when these modules are ported
    // UsersModule,
    AuthModule,
    // ServicesModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
