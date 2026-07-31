import { config as dotenvConfig } from 'dotenv';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

dotenvConfig({ path: '.env', quiet: true });

// Shared between the Nest DatabaseModule and the TypeORM CLI datasource.
export const ORM_BASE_OPTIONS = {
  entities: ['dist/**/*.entity.js'],
  migrations: [
    'dist/database/migrations/*{.ts,.js}',
    'dist/base/database/postgre-sql/migrations/*{.ts,.js}',
  ],
  namingStrategy: new SnakeNamingStrategy(),
};

// Options for the TypeORM CLI (migrations) — the CLI runs outside Nest DI,
// so it reads process.env directly instead of using ConfigService.
export const ORM_CONFIG = {
  type: process.env.DB_TYPE || 'postgres',
  host: process.env.DB_HOST || '',
  port: parseInt(process.env.DB_PORT ?? '', 10) || 5432,
  username: process.env.DB_USERNAME || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  migrationsRun: process.env.MIGRATIONS_RUN === 'true',
  synchronize: process.env.DB_AUTO_SYNCHRONIZE_ENTITY === 'true',
  logging: process.env.DB_LOGGING_DEBUG === 'true',
  ...ORM_BASE_OPTIONS,
} as DataSourceOptions;
