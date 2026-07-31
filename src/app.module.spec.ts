import { AUDIT_LOG_WRITER } from '@base/interfaces/audit-log.interface';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { AuditLog } from '@modules/audit-logs/entities/audit-log.entity';
import { AppModule } from './app.module';

jest.setTimeout(30000);

describe('AppModule DI graph', () => {
  it('compiles without a real database', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getDataSourceToken())
      .useValue({
        isInitialized: true,
        getRepository: () => ({}),
        destroy: jest.fn(),
      })
      .overrideProvider(getRepositoryToken(AuditLog))
      .useValue({ create: jest.fn(), save: jest.fn(), find: jest.fn() })
      .compile();

    expect(moduleRef.get(AUDIT_LOG_WRITER)).toBeDefined();
    await moduleRef.close();
  });
});
