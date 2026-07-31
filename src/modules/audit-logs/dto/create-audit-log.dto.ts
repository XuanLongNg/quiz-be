import { AuditAction } from '@base/common/constants/app.constant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAuditLogDto {
  @ApiProperty({ enum: AuditAction })
  @IsEnum(AuditAction)
  @IsNotEmpty()
  action: AuditAction;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userFullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  oldValues?: any;

  @ApiPropertyOptional()
  @IsOptional()
  newValues?: any;

  @ApiPropertyOptional()
  @IsOptional()
  changes?: any;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;
}
