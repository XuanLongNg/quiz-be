import { ConfigService } from '@base/configs/config.service';
import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly redis: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configs: ConfigService) {
    const { port, host, ...configRedis } = this.configs.REDIS;
    this.redis = new Redis(port, host, {
      ...configRedis,
      retryStrategy: (times) => {
        return Math.min(times * 2000, 10000);
      },
      maxRetriesPerRequest: 10,
    });
  }

  async set(key: string, value: string | number | Buffer, ttl?: number) {
    if (!this.redis) {
      this.logger.warn('Redis is not initialized');
      return;
    }
    try {
      await this.redis.set(key, value);
      if (ttl) await this.redis.expire(key, ttl);
      this.logger.log(`String: Set key ${key} with value ${String(value)}`);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async get(key: string) {
    if (!this.redis) {
      this.logger.warn('Redis is not initialized');
      return null;
    }
    try {
      this.logger.log(`String: Get key ${key}`);
      return await this.redis.get(key);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async del(key: string) {
    if (!this.redis) {
      this.logger.warn('Redis is not initialized');
      return;
    }
    try {
      this.logger.log(`String: Delete key ${key}`);
      return await this.redis.del(key);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async delMultiPrefix(prefix: string) {
    if (!this.redis) {
      this.logger.warn('Redis is not initialized');
      return;
    }
    try {
      this.logger.log(`All: Delete multi key with prefix ${prefix}`);
      const keys = [];
      let cursor = '0';

      do {
        const result = await this.redis.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          100,
        );
        cursor = result[0];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        keys.push(...result[1]);
      } while (cursor !== '0');
      if (keys.length === 0) return;
      await this.redis.del(...keys);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
