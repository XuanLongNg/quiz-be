import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { IsOrderParams } from '@base/decorators/is-order-params.decorator';
import { ApiProperty } from '@nestjs/swagger';

export function OrderParams(validFields: string[]) {
  return applyDecorators(
    ApiProperty(),
    IsOptional(),
    IsString({ each: true }),
    IsOrderParams(validFields),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? [value] : value,
    ),
  );
}
