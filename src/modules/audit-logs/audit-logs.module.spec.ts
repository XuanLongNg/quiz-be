import { ConfigModule } from '@base/configs/config.module';
import { AuditLogInterceptor } from '@base/interceptors/audit-log.interceptor';
import { AUDIT_LOG_WRITER } from '@base/interfaces/audit-log.interface';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogsModule } from './audit-logs.module';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogHelperService } from './services/audit-log-helper.service';

describe('AuditLogsModule', () => {
  it('satisfies the base AUDIT_LOG_WRITER contract with AuditLogHelperService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule, AuditLogsModule],
    })
      .overrideProvider(getRepositoryToken(AuditLog))
      .useValue({ create: jest.fn(), save: jest.fn(), find: jest.fn() })
      .compile();

    const writer = moduleRef.get<Record<string, unknown>>(AUDIT_LOG_WRITER);

    expect(writer).toBe(moduleRef.get(AuditLogHelperService));
    for (const method of [
      'logCreate',
      'logUpdate',
      'logDelete',
      'logRestore',
      'logAction',
    ]) {
      expect(typeof writer[method]).toBe('function');
    }
  });

  it('registers AuditLogInterceptor globally', () => {
    const providers = Reflect.getMetadata(
      'providers',
      AuditLogsModule,
    ) as Array<{ provide?: unknown; useClass?: unknown }>;

    expect(
      providers.some(
        (p) =>
          p?.provide === APP_INTERCEPTOR && p?.useClass === AuditLogInterceptor,
      ),
    ).toBe(true);
  });
});
