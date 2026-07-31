import { ConfigService } from '@base/configs/config.service';
import { ORM_BASE_OPTIONS } from '@base/database/postgre-sql/orm.config';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
// import { RedisService } from '@base/database/redis/redis.service';

/**
 * Database Module.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configs: ConfigService) =>
        ({
          ...configs.DATABASE,
          ...ORM_BASE_OPTIONS,
          retryAttempts: 3,
          retryDelay: 5000,
        }) as TypeOrmModuleOptions,
    }),
  ],
  controllers: [],
  // providers: [RedisService],
  // exports: [RedisService],
})
export class DatabaseModule {}
