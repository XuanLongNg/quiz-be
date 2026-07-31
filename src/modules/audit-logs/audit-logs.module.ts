import { AuditLogInterceptor } from '@base/interceptors/audit-log.interceptor';
import { AUDIT_LOG_WRITER } from '@base/interfaces/audit-log.interface';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
// TODO(auth): re-enable AuditLogsController once the auth module (JwtAuthGuard,
// RolesGuard) is ported — the read endpoints must stay behind admin guards.
// import { AuditLogsController } from './controllers/audit-logs.controller';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogHelperService } from './services/audit-log-helper.service';
import { AuditLogService } from './services/audit-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    AuditLogService,
    AuditLogHelperService,
    // Satisfies the abstract contract base depends on, so base/ never imports
    // from modules/.
    {
      provide: AUDIT_LOG_WRITER,
      useExisting: AuditLogHelperService,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
  exports: [AuditLogService, AuditLogHelperService, AUDIT_LOG_WRITER],
  controllers: [],
})
export class AuditLogsModule {}
