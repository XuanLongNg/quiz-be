import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export function FilterParams(validFields: string[]) {
  return applyDecorators(
    ApiProperty(),
    IsOptional(),
    IsString({ each: true }),
    IsIn(validFields, { each: true }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? [value] : value,
    ),
  );
}
