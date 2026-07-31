import { AppException } from '@base/common/errors/app.exception';
import { BaseErrorCode, errorMessageKey } from '@base/common/errors/error-code';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nContext, I18nService, I18nValidationException } from 'nestjs-i18n';

interface ResolvedError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

interface FieldError {
  field: string;
  messages: string[];
}

const SERVER_ERROR_MIN_STATUS = 500;

const STATUS_TO_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: BaseErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: BaseErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: BaseErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: BaseErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: BaseErrorCode.CONFLICT,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const resolved = this.resolve(exception);

    this.logger.error(
      `Http Status: ${resolved.status} Code: ${resolved.code} Message: ${resolved.message}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(resolved.status).json({
      statusCode: resolved.status,
      code: resolved.code,
      message: resolved.message,
      ...(resolved.details === undefined ? {} : { details: resolved.details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof I18nValidationException) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: BaseErrorCode.VALIDATION_FAILED,
        message: this.translate(BaseErrorCode.VALIDATION_FAILED),
        details: this.extractFieldErrors(exception),
      };
    }

    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: this.translate(exception.code, exception.args),
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code =
        STATUS_TO_CODE[status] ??
        (status >= SERVER_ERROR_MIN_STATUS
          ? BaseErrorCode.INTERNAL_ERROR
          : BaseErrorCode.BAD_REQUEST);

      return {
        status,
        code,
        message: this.extractHttpMessage(exception) ?? this.translate(code),
      };
    }

    // Unknown throwable: the raw message may carry SQL or constraint names,
    // so it is logged above and never sent to the client.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: BaseErrorCode.INTERNAL_ERROR,
      message: this.translate(BaseErrorCode.INTERNAL_ERROR),
    };
  }

  private translate(code: string, args?: Record<string, unknown>): string {
    return this.i18n.t(errorMessageKey(code), {
      lang: I18nContext.current()?.lang,
      args,
    });
  }

  private extractHttpMessage(exception: HttpException): string | undefined {
    const body: unknown = exception.getResponse();

    if (typeof body === 'string') return body;

    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message: unknown = body.message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.map(String).join('; ');
    }

    return undefined;
  }

  private extractFieldErrors(exception: I18nValidationException): FieldError[] {
    return exception.errors.map((error) => ({
      field: error.property,
      messages: Object.values(error.constraints ?? {}).map((raw) =>
        this.translateConstraint(raw),
      ),
    }));
  }

  /** class-validator messages arrive as `i18nKey|{"args":...}`. */
  private translateConstraint(rawMessage: string): string {
    const [key, argsStr] = rawMessage.split('|');
    try {
      const args = (argsStr ? JSON.parse(argsStr) : {}) as Record<
        string,
        unknown
      >;
      return this.i18n.t(key, {
        lang: I18nContext.current()?.lang,
        args,
      });
    } catch {
      return rawMessage;
    }
  }
}
