import { AuditAction } from '@base/common/constants/app.constant';
import { FilterParams } from '@base/decorators/filter-params.decorator';
import { OrderParams } from '@base/decorators/order-params.decorator';
import { FilterDto } from '@base/dtos/filter.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AuditLogFilterDto extends FilterDto {
  @ApiPropertyOptional({
    description: 'Search keyword - must be used with filterBy',
    required: false,
    example: 'john',
  })
  @IsOptional()
  @IsString()
  override k?: string = undefined;

  @ApiPropertyOptional({
    description:
      'Fields to search in (use with k parameter). Valid: userEmail, userFullName, description, entityType, action',
    type: [String],
    required: false,
    example: ['userEmail', 'description'],
  })
  @FilterParams([
    'userEmail',
    'userFullName',
    'description',
    'entityType',
    'action',
  ])
  override filterBy?: string[] = undefined;

  @ApiPropertyOptional({
    description:
      'Fields to sort by. Format: fieldName:direction (ASC/DESC). Valid: timestamp, action, entityType, userEmail',
    type: [String],
    required: false,
    example: ['timestamp:DESC', 'action:ASC'],
  })
  @OrderParams(['timestamp', 'action', 'entityType', 'userEmail'])
  override orderBy?: string[] = undefined;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value ? new Date(value as string).toISOString() : undefined,
  )
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value ? new Date(value as string).toISOString() : undefined,
  )
  endDate?: string;
}
