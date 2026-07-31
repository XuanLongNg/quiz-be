import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private readonly env: NestConfigService) {}

  private str(key: string, fallback = ''): string {
    return this.env.get<string>(key) ?? fallback;
  }

  private int(key: string, fallback: number): number {
    return parseInt(this.env.get<string>(key) ?? '', 10) || fallback;
  }

  private bool(key: string, fallback = false): boolean {
    const value = this.env.get<string>(key);
    if (value === undefined) return fallback;
    return value === 'true';
  }

  get NODE_ENV() {
    return this.str('NODE_ENV', 'development');
  }
  get HOST() {
    return this.str('HOST', 'http://localhost');
  }
  get PORT() {
    return this.str('PORT', '4000');
  }
  get DOMAIN() {
    return this.str('DOMAIN', 'http://localhost:4000');
  }
  get FRONTEND_URL() {
    return this.str('FRONTEND_URL', 'http://localhost:3000');
  }

  get JWT_SECRET() {
    return this.str('JWT_SECRET', 'super_secret');
  }
  get JWT_EXPIRATION_TIME() {
    return this.str('JWT_EXPIRATION_TIME', '12h');
  }
  get JWT_REFRESH_SECRET() {
    return this.str('JWT_REFRESH_SECRET', 'super_secret_refresh');
  }
  get JWT_REFRESH_EXPIRATION_TIME() {
    return this.str('JWT_REFRESH_EXPIRATION_TIME', '7d');
  }
  get JWT_INVITE_SECRET() {
    return this.str('JWT_INVITE_SECRET', 'super_secret_invite');
  }
  get JWT_INVITE_EXPIRATION_TIME() {
    return this.str('JWT_INVITE_EXPIRATION_TIME', '7d');
  }
  get JWT_RESET_PASSWORD_SECRET() {
    return this.str('JWT_RESET_PASSWORD_SECRET', 'super_secret_reset_password');
  }
  get JWT_RESET_PASSWORD_EXPIRATION_TIME() {
    return this.str('JWT_RESET_PASSWORD_EXPIRATION_TIME', '1h');
  }

  get DATABASE() {
    return {
      host: this.str('DB_HOST'),
      port: this.int('DB_PORT', 5432),
      username: this.str('DB_USERNAME'),
      password: this.str('DB_PASSWORD'),
      database: this.str('DB_NAME'),
      type: this.str('DB_TYPE', 'postgres'),
      migrationsRun: this.bool('MIGRATIONS_RUN'),
      synchronize: this.bool('DB_AUTO_SYNCHRONIZE_ENTITY'),
      logging: this.bool('DB_LOGGING_DEBUG'),
    };
  }

  get REDIS() {
    return {
      host: this.str('REDIS_HOST', '127.0.0.1'),
      port: this.int('REDIS_PORT', 6379),
      username: this.str('REDIS_USERNAME'),
      password: this.str('REDIS_PASSWORD'),
    };
  }

  get MINIO() {
    return {
      endPoint: this.str('MINIO_ENDPOINT', 'localhost'),
      port: this.int('MINIO_PORT', 9000),
      useSSL: this.bool('MINIO_USE_SSL'),
      accessKey: this.str('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.str('MINIO_SECRET_KEY', 'minioadmin'),
      bucket: this.str('MINIO_BUCKET', 'mely-blog'),
      region: this.str('MINIO_REGION', 'us-east-1'),
      publicEndpoint: this.str(
        'MINIO_PUBLIC_ENDPOINT',
        this.str('MINIO_ENDPOINT', 'localhost:9000'),
      ),
      expiryInSeconds: this.int('MINIO_EXPIRY_SECONDS', 10 * 60),
      fixedExpiryInSeconds: this.int(
        'MINIO_FIXED_EXPIRY_SECONDS',
        24 * 60 * 60,
      ),
    };
  }

  get ELASTICSEARCH() {
    return {
      node: this.str('ELASTICSEARCH_NODE', 'http://localhost:9200'),
      auth: {
        username: this.str('ELASTICSEARCH_USERNAME'),
        password: this.str('ELASTICSEARCH_PASSWORD'),
      },
      cloud: null,
    };
  }

  get MAIL() {
    return {
      host: this.str('MAIL_HOST'),
      port: this.int('MAIL_PORT', 587),
      secure: this.bool('MAIL_SECURE'),
      auth: {
        user: this.str('MAIL_USERNAME'),
        pass: this.str('MAIL_PASSWORD'),
      },
    };
  }

  get AUDIT_LOG() {
    return {
      enabled: this.bool('AUDIT_LOG_ENABLED', true),
      logReadActions: this.bool('AUDIT_LOG_READ_ACTIONS', false),
      retentionDays: this.int('AUDIT_LOG_RETENTION_DAYS', 365),
      excludeRoutes: this.str(
        'AUDIT_LOG_EXCLUDE_ROUTES',
        '/health,/api/v1/docs',
      ).split(','),
    };
  }
}
