import { AuditAction } from '@base/common/constants/app.constant';
import { User } from '@base/entities/user.entity';
import { IAuditLogWriter } from '@base/interfaces/audit-log.interface';
import { Injectable, Logger } from '@nestjs/common';
import { omit } from 'lodash';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AuditLogHelperService implements IAuditLogWriter {
  private readonly logger = new Logger(AuditLogHelperService.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  async logCreate(
    entityType: string,
    entityId: string,
    newValues: Record<string, unknown>,
    user?: User,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const sanitizedNewValues = this.sanitizeData(newValues);

      await this.auditLogService.create({
        action: AuditAction.CREATE,
        entityType,
        entityId: String(entityId),
        userId: user?.id,
        userEmail: user?.email,
        userFullName: this.getFullName(user),
        newValues: sanitizedNewValues,
        description: `Created ${entityType} with ID: ${entityId}`,
        metadata,
        ipAddress,
        userAgent,
      });
    } catch (e: unknown) {
      this.logger.error('Failed to log CREATE action', e);
    }
  }

  async logUpdate(
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    user?: User,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const sanitizedOldValues = this.sanitizeData(oldValues);
      const sanitizedNewValues = this.sanitizeData(newValues);
      const changes = this.compareAndExtractChanges(
        sanitizedOldValues,
        sanitizedNewValues,
      );

      if (Object.keys(changes).length === 0) {
        return;
      }

      await this.auditLogService.create({
        action: AuditAction.UPDATE,
        entityType,
        entityId: String(entityId),
        userId: user?.id,

        userEmail: user?.email,

        userFullName: this.getFullName(user),
        oldValues: sanitizedOldValues,
        newValues: sanitizedNewValues,
        changes,
        description: `Updated ${entityType} with ID: ${entityId}`,
        metadata,
        ipAddress,
        userAgent,
      });
    } catch (e: unknown) {
      this.logger.error('Failed to log UPDATE action', e);
    }
  }

  async logDelete(
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    user?: User,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const sanitizedOldValues = this.sanitizeData(oldValues);

      await this.auditLogService.create({
        action: AuditAction.DELETE,
        entityType,
        entityId: String(entityId),
        userId: user?.id,

        userEmail: user?.email,

        userFullName: this.getFullName(user),
        oldValues: sanitizedOldValues,
        description: `Deleted ${entityType} with ID: ${entityId}`,
        metadata,
        ipAddress,
        userAgent,
      });
    } catch (e: unknown) {
      this.logger.error('Failed to log DELETE action', e);
    }
  }

  async logRestore(
    entityType: string,
    entityId: string,
    user?: User,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogService.create({
        action: AuditAction.RESTORE,
        entityType,
        entityId: String(entityId),
        userId: user?.id,

        userEmail: user?.email,

        userFullName: this.getFullName(user),
        description: `Restored ${entityType} with ID: ${entityId}`,
        metadata,
        ipAddress,
        userAgent,
      });
    } catch (e: unknown) {
      this.logger.error('Failed to log RESTORE action', e);
    }
  }

  async logAction(
    action: AuditAction,
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any,
    user?: User,
    description?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const sanitizedOldValues = oldValues
        ? this.sanitizeData(oldValues as Record<string, unknown>)
        : undefined;
      const sanitizedNewValues = newValues
        ? this.sanitizeData(newValues as Record<string, unknown>)
        : undefined;
      const changes =
        sanitizedOldValues && sanitizedNewValues
          ? this.compareAndExtractChanges(
              sanitizedOldValues,
              sanitizedNewValues,
            )
          : undefined;

      await this.auditLogService.create({
        action,
        entityType,
        entityId: String(entityId),
        userId: user?.id,

        userEmail: user?.email,

        userFullName: this.getFullName(user),
        oldValues: sanitizedOldValues,
        newValues: sanitizedNewValues,
        changes,
        description:
          description || `${action} ${entityType} with ID: ${entityId}`,
        metadata: metadata as Record<string, unknown> | undefined,
        ipAddress,
        userAgent,
      });
    } catch (e: unknown) {
      this.logger.error(`Failed to log ${action} action`, e);
    }
  }

  compareAndExtractChanges(
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
  ): Record<string, { old: unknown; new: unknown }> {
    if (!oldValues || !newValues) {
      return {};
    }

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const allKeys = new Set([
      ...Object.keys(oldValues || {}),
      ...Object.keys(newValues || {}),
    ]);

    for (const key of allKeys) {
      const oldValue = oldValues[key];
      const newValue = newValues[key];

      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
        continue;
      }

      if (
        [
          'createTimestamp',
          'updateTimestamp',
          'deleteTimestamp',
          'createUserId',
          'updateUserId',
          'deleteUserId',
        ].includes(key)
      ) {
        continue;
      }

      changes[key] = {
        old: oldValue,
        new: newValue,
      };
    }

    return changes;
  }

  private getFullName(user?: User): string | undefined {
    if (!user) return undefined;
    return (
      [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
    );
  }

  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data as Record<string, unknown>;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'accessToken',
      'refreshToken',
    ];

    const sanitized: Record<string, unknown> = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return omit(sanitized, [
      'createTimestamp',
      'updateTimestamp',
      'deleteTimestamp',
      'createUserId',
      'updateUserId',
      'deleteUserId',
    ]);
  }
}
