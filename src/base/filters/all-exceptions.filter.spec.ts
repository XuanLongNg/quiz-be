import { AppException } from '@base/common/errors/app.exception';
import { BaseErrorCode } from '@base/common/errors/error-code';
import { AllExceptionsFilter } from '@base/filters/all-exceptions.filter';
import {
  ArgumentsHost,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { I18nService, I18nValidationException } from 'nestjs-i18n';

// Echoes the key back so assertions can tell which i18n entry was used.
const i18nMock = {
  t: (key: string) => `T(${key})`,
} as unknown as I18nService;

function run(exception: unknown) {
  let status = 0;
  let body: Record<string, unknown> = {};

  const json = (payload: Record<string, unknown>) => {
    body = payload;
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({
        status: (code: number) => {
          status = code;
          return { json };
        },
      }),
      getRequest: () => ({ url: '/api/v1/users' }),
    }),
  } as unknown as ArgumentsHost;

  new AllExceptionsFilter(i18nMock).catch(exception, host);

  return { status, body };
}

describe('AllExceptionsFilter', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => jest.restoreAllMocks());

  it('renders code, translated message and details for an AppException', () => {
    const { status, body } = run(
      AppException.notFound({ details: { id: 'user-1' } }),
    );

    expect(status).toBe(404);
    expect(body.code).toBe(BaseErrorCode.NOT_FOUND);
    expect(body.message).toBe('T(errors.NOT_FOUND)');
    expect(body.details).toEqual({ id: 'user-1' });
    expect(body.path).toBe('/api/v1/users');
  });

  it('maps a plain HttpException to a code and keeps its own message', () => {
    const { status, body } = run(new NotFoundException('Không tìm thấy user'));

    expect(status).toBe(404);
    expect(body.code).toBe(BaseErrorCode.NOT_FOUND);
    expect(body.message).toBe('Không tìm thấy user');
  });

  it('falls back to BAD_REQUEST for an unmapped 4xx instead of VALIDATION_FAILED', () => {
    const { status, body } = run(new UnprocessableEntityException());

    expect(status).toBe(422);
    expect(body.code).toBe(BaseErrorCode.BAD_REQUEST);
  });

  it('never leaks the raw message of an unknown error', () => {
    const leak = 'duplicate key value violates unique constraint "users_email"';
    const { status, body } = run(new Error(leak));

    expect(status).toBe(500);
    expect(body.code).toBe(BaseErrorCode.INTERNAL_ERROR);
    expect(body.message).toBe('T(errors.INTERNAL_ERROR)');
    expect(JSON.stringify(body)).not.toContain('users_email');
  });

  it('reports validation failures per field in details', () => {
    const { status, body } = run(
      new I18nValidationException([
        {
          property: 'email',
          constraints: { isEmail: 'validation.IS_EMAIL' },
        },
      ]),
    );

    expect(status).toBe(400);
    expect(body.code).toBe(BaseErrorCode.VALIDATION_FAILED);
    expect(body.details).toEqual([
      { field: 'email', messages: ['T(validation.IS_EMAIL)'] },
    ]);
  });

  it('omits details when there are none', () => {
    const { body } = run(new NotFoundException());

    expect('details' in body).toBe(false);
  });
});
