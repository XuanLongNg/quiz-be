import { RESPONSE_MESSAGE_KEY } from '@base/decorators/response-message.decorator';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: unknown;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data: unknown) => {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse<{ statusCode: number }>();
        const message =
          this.reflector.get<string>(
            RESPONSE_MESSAGE_KEY,
            context.getHandler(),
          ) || 'Thao tác thành công';

        let resultData = data as T;
        let meta: unknown = undefined;

        if (
          data &&
          typeof data === 'object' &&
          'meta' in data &&
          'data' in data
        ) {
          const dataObj = data as Record<string, unknown>;
          meta = dataObj['meta'];
          resultData = dataObj['data'] as T;
        } else if (
          data &&
          typeof data === 'object' &&
          'metadata' in data &&
          'data' in data
        ) {
          const dataObj = data as Record<string, unknown>;
          meta = dataObj['metadata'];
          resultData = dataObj['data'] as T;
        }

        return {
          statusCode: response.statusCode,
          message,
          data: resultData,
          meta,
        };
      }),
    );
  }
}
