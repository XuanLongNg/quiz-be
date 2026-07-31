import { AuditAction } from '@base/common/constants/app.constant';
import { RequestCustom } from '@base/common/types/request-custom';
import { ConfigService } from '@base/configs/config.service';
import {
  AUDIT_LOG_KEY,
  AuditLogMetadata,
  SKIP_AUDIT_LOG_KEY,
} from '@base/decorators/audit-log.decorator';
import { AUDIT_LOG_WRITER } from '@base/interfaces/audit-log.interface';
import type { IAuditLogWriter } from '@base/interfaces/audit-log.interface';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly configs: ConfigService,
    @Optional()
    @Inject(AUDIT_LOG_WRITER)
    private readonly auditLogWriter?: IAuditLogWriter,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.auditLogWriter || !this.configs.AUDIT_LOG.enabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestCustom>();
    const response = context.switchToHttp().getResponse<{
      statusCode: number;
    }>();
    const handler = context.getHandler();
    const controller = context.getClass();

    const skipAuditLog = this.reflector.getAllAndOverride<boolean>(
      SKIP_AUDIT_LOG_KEY,
      [handler, controller],
    );

    if (skipAuditLog) {
      return next.handle();
    }

    const routePath = (request as { route?: { path?: string } }).route?.path;
    const route: string = routePath || request.url || '';
    if (this.shouldSkipRoute(route)) {
      return next.handle();
    }

    if (route.startsWith('/audit-logs')) {
      return next.handle();
    }

    const auditMetadata = this.reflector.getAllAndOverride<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      [handler, controller],
    );

    const method = request.method;
    const action = this.getActionFromMethod(method, auditMetadata?.action);
    const entityType =
      auditMetadata?.entityType || this.extractEntityType(route);

    const startTime = Date.now();
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap({
        next: (data) => {
          void this.logRequest(
            action,
            entityType,
            request,
            response,
            data,
            startTime,
            ipAddress,
            userAgent,
          );
        },
        error: (error: unknown) => {
          const errorObj =
            error instanceof Error ? error : new Error(String(error));
          void this.logRequest(
            action,
            entityType,
            request,
            response,
            null,
            startTime,
            ipAddress,
            userAgent,
            errorObj,
          );
        },
      }),
    );
  }

  private shouldSkipRoute(route: string): boolean {
    return this.configs.AUDIT_LOG.excludeRoutes.some((excludedRoute) =>
      route.startsWith(excludedRoute.trim()),
    );
  }

  private getActionFromMethod(
    method: string,
    customAction?: AuditAction,
  ): AuditAction | null {
    if (customAction) {
      return customAction;
    }

    const methodActionMap: Record<string, AuditAction> = {
      POST: AuditAction.CREATE,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };

    return methodActionMap[method] || null;
  }

  private extractEntityType(route: string): string {
    const parts = route.split('/').filter(Boolean);
    if (parts.length > 0) {
      const entityPart = parts[parts.length - 1];
      if (entityPart && typeof entityPart === 'string') {
        return entityPart.charAt(0).toUpperCase() + entityPart.slice(1);
      }
    }
    return 'Unknown';
  }

  private getClientIp(request: RequestCustom): string | undefined {
    const forwardedFor = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];
    const expressRequest = request as {
      ip?: string;
      socket?: { remoteAddress?: string };
    };

    const forwardedIp =
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : undefined;
    const realIpStr = typeof realIp === 'string' ? realIp : undefined;

    return (
      forwardedIp ||
      realIpStr ||
      expressRequest.ip ||
      expressRequest.socket?.remoteAddress
    );
  }

  private async logRequest(
    action: AuditAction | null,
    entityType: string,
    request: RequestCustom,
    response: { statusCode: number },
    data: unknown,
    startTime: number,
    ipAddress?: string,
    userAgent?: string,
    error?: Error,
  ): Promise<void> {
    if (!action && request.method === 'GET') {
      if (!this.configs.AUDIT_LOG.logReadActions) {
        return;
      }
    }

    const duration = Date.now() - startTime;
    const statusCode: number = response.statusCode;
    const entityId = this.extractEntityId(request);

    const errorMessage = error
      ? error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error)
      : 'Unknown error';
    const description = error
      ? `Failed ${request.method} ${request.url} - ${errorMessage}`
      : `Success ${request.method} ${request.url} (${duration}ms)`;

    try {
      if (action) {
        await this.auditLogWriter?.logAction(
          action,
          entityType,
          entityId || 'N/A',
          null,
          {
            method: request.method,
            url: request.url || '',
            statusCode,
            duration,
            error: errorMessage,
          },
          request.user,
          description,
          {
            method: request.method || '',
            url: request.url || '',
            statusCode,
            duration,
            body: this.sanitizeRequestBody(request.body),
            query: (request.query as Record<string, unknown>) || {},
            params: (request.params as Record<string, unknown>) || {},
          },
          ipAddress,
          userAgent,
        );
      } else if (
        this.configs.AUDIT_LOG.logReadActions &&
        request.method === 'GET'
      ) {
        await this.auditLogWriter?.logAction(
          AuditAction.CREATE,
          'HTTPRequest',
          entityId || 'N/A',
          null,
          {
            method: request.method || '',
            url: request.url || '',
            statusCode,
            duration,
          },
          request.user,
          description,
          {
            method: request.method,
            url: request.url,
            statusCode,
            duration,
            query: request.query as Record<string, unknown>,
            params: request.params as Record<string, unknown>,
          },
          ipAddress,
          userAgent,
        );
      }
    } catch {
      // Silently fail - audit logging should not break the main flow
    }
  }

  private extractEntityId(request: RequestCustom): string | null {
    const id = request.params?.id;
    const entityId = request.params?.entityId;
    if (typeof id === 'string') return id;
    if (typeof entityId === 'string') return entityId;
    return null;
  }

  private sanitizeRequestBody(body: unknown): unknown {
    if (!body || typeof body !== 'object' || body === null) {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
    const sanitized = { ...(body as Record<string, unknown>) };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
