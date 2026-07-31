import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Token } from '@/modules/auth/entities/token.entity';

@Injectable()
export class TokenCron {
  private readonly logger = new Logger(TokenCron.name);

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCron() {
    this.logger.debug('Running expired tokens cleanup...');
    const now = new Date();
    const result = await this.tokenRepository.delete({
      expiresAt: LessThan(now),
    });
    this.logger.debug(`Deleted ${result.affected} expired tokens.`);
  }
}
