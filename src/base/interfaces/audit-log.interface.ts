import { AuditAction } from '@/base/common/constants/app.constant';
import { User } from '@/base/entities/user.entity';

/**
 * DI token for the audit log writer implementation.
 * Base only owns the contract; a feature module (e.g. modules/audit-logs)
 * provides the implementation. With no provider registered, audit logging
 * is a no-op so base stays portable across projects.
 */
export const AUDIT_LOG_WRITER = Symbol('AUDIT_LOG_WRITER');

export interface IAuditLogWriter {
  logCreate(
    entityType: string,
    entityId: string,
    newValues: Record<string, unknown>,
    user?: User,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void>;

  logUpdate(
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    user?: User,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void>;

  logDelete(
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    user?: User,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void>;

  logRestore(
    entityType: string,
    entityId: string,
    user?: User,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void>;

  logAction(
    action: AuditAction,
    entityType: string,
    entityId: string,
    oldValues: unknown,
    newValues: unknown,
    user?: User,
    description?: string,
    metadata?: unknown,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void>;
}

export interface IAuditLogOptions {
  auditLogWriter?: IAuditLogWriter;
  currentUser?: User;
  entityType?: string;
  ipAddress?: string;
  userAgent?: string;
}
