import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '@/base/common/constants/app.constant';

export const AUDIT_LOG_KEY = 'auditLog';
export const SKIP_AUDIT_LOG_KEY = 'skipAuditLog';

export interface AuditLogMetadata {
  action?: AuditAction;
  entityType?: string;
}

export const AuditLog = (metadata?: AuditLogMetadata) =>
  SetMetadata(AUDIT_LOG_KEY, metadata || {});

export const SkipAuditLog = () => SetMetadata(SKIP_AUDIT_LOG_KEY, true);
