import { BaseErrorCode } from '@base/common/errors/error-code';
import { HttpException, HttpStatus } from '@nestjs/common';

export interface AppExceptionOptions {
  /** Interpolation args for the i18n message. */
  args?: Record<string, unknown>;
  /** Extra machine-readable payload for the client (e.g. per-field validation errors). */
  details?: unknown;
  /** Original error, kept for logging — never serialised to the client. */
  cause?: unknown;
}

/**
 * Application error carrying a stable `code` on top of the HTTP status.
 *
 * The status tells the client *how* to react at transport level; the code tells
 * it *what* happened. Only declare a distinct code when the client must behave
 * differently — otherwise reuse a base code and vary the message.
 */
export class AppException extends HttpException {
  readonly code: string;
  readonly args?: Record<string, unknown>;
  readonly details?: unknown;

  constructor(
    code: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    options: AppExceptionOptions = {},
  ) {
    super(code, status, { cause: options.cause });
    this.code = code;
    this.args = options.args;
    this.details = options.details;
  }

  /**
   * Normalises an unknown throwable into an HttpException.
   * Keeps an existing HttpException as-is (so a NotFound thrown deeper down does
   * not get flattened into a 500) and hides the raw message of anything else —
   * driver errors leak SQL and constraint names.
   */
  static from(error: unknown): HttpException {
    if (error instanceof HttpException) return error;
    return AppException.internal({ cause: error });
  }

  static internal(options?: AppExceptionOptions): AppException {
    return new AppException(
      BaseErrorCode.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
      options,
    );
  }

  static validationFailed(options?: AppExceptionOptions): AppException {
    return new AppException(
      BaseErrorCode.VALIDATION_FAILED,
      HttpStatus.BAD_REQUEST,
      options,
    );
  }

  static badRequest(options?: AppExceptionOptions): AppException {
    return new AppException(
      BaseErrorCode.BAD_REQUEST,
      HttpStatus.BAD_REQUEST,
      options,
    );
  }

  static unauthorized(options?: AppExceptionOptions): AppException {
    return new AppException(
      BaseErrorCode.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
      options,
    );
  }

  static forbidden(options?: AppExceptionOptions): AppException {
    return new AppException(
      BaseErrorCode.FORBIDDEN,
      HttpStatus.FORBIDDEN,
      options,
    );
  }

  static notFound(options?: AppExceptionOptions): AppException {
    return new AppException(
      BaseErrorCode.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      options,
    );
  }

  static conflict(options?: AppExceptionOptions): AppException {
    return new AppException(
      BaseErrorCode.CONFLICT,
      HttpStatus.CONFLICT,
      options,
    );
  }
}
