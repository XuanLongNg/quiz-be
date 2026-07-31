import { ConfigService } from '@base/configs/config.service';
import { AuditLogInterceptor } from '@base/interceptors/audit-log.interceptor';
import {
  AUDIT_LOG_WRITER,
  IAuditLogWriter,
} from '@base/interfaces/audit-log.interface';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';

const configMock = {
  AUDIT_LOG: {
    enabled: true,
    logReadActions: false,
    retentionDays: 365,
    excludeRoutes: ['/health'],
  },
} as unknown as ConfigService;

function contextMock(): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'POST',
        url: '/users',
        route: { path: '/users' },
        headers: { 'user-agent': 'jest' },
        params: { id: 'user-1' },
        query: {},
        body: { email: 'a@b.c', password: 'secret' },
      }),
      getResponse: () => ({ statusCode: 201 }),
    }),
    getHandler: () => function create() {},
    getClass: () => class UsersController {},
  } as unknown as ExecutionContext;
}

const nextMock = (): CallHandler => ({ handle: () => of({ id: 'user-1' }) });

async function buildInterceptor(writer?: IAuditLogWriter) {
  const providers = [
    AuditLogInterceptor,
    Reflector,
    { provide: ConfigService, useValue: configMock },
    ...(writer ? [{ provide: AUDIT_LOG_WRITER, useValue: writer }] : []),
  ];
  const moduleRef = await Test.createTestingModule({ providers }).compile();
  return moduleRef.get(AuditLogInterceptor);
}

describe('AuditLogInterceptor', () => {
  it('instantiates and passes through when no writer is registered', async () => {
    const interceptor = await buildInterceptor();
    const next = nextMock();
    const handleSpy = jest.spyOn(next, 'handle');

    const result = await firstValueFrom(
      interceptor.intercept(contextMock(), next),
    );

    expect(handleSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'user-1' });
  });

  it('delegates to the writer registered under AUDIT_LOG_WRITER', async () => {
    const writer = { logAction: jest.fn().mockResolvedValue(undefined) };
    const interceptor = await buildInterceptor(
      writer as unknown as IAuditLogWriter,
    );

    await firstValueFrom(interceptor.intercept(contextMock(), nextMock()));
    await new Promise((resolve) => setImmediate(resolve));

    expect(writer.logAction).toHaveBeenCalledTimes(1);
    const [action, entityType, entityId, , , , , metadata] = writer.logAction
      .mock.calls[0] as unknown[];
    expect(action).toBe('CREATE');
    expect(entityType).toBe('Users');
    expect(entityId).toBe('user-1');
    expect((metadata as { body: Record<string, unknown> }).body.password).toBe(
      '[REDACTED]',
    );
  });
});
