import { AuditAction } from '@base/common/constants/app.constant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: AuditAction })
  action: AuditAction;

  @ApiProperty()
  entityType: string;

  @ApiProperty()
  entityId: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional()
  userEmail?: string;

  @ApiPropertyOptional()
  userFullName?: string;

  @ApiPropertyOptional()
  oldValues?: any;

  @ApiPropertyOptional()
  newValues?: any;

  @ApiPropertyOptional()
  changes?: any;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  timestamp: Date;
}
