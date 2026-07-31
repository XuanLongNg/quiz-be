import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderParams } from '@base/decorators/order-params.decorator';
import { FilterParams } from '@base/decorators/filter-params.decorator';

export class PaginationDto {
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  @IsNumber({}, { message: 'Page must be a number' })
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  @IsNumber({}, { message: 'Page size must be a number' })
  @IsOptional()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class FilterDto extends PaginationDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  k?: string;

  @FilterParams(['createTimestamp'])
  filterBy?: string[];

  @OrderParams(['createTimestamp'])
  orderBy?: string[];
}
