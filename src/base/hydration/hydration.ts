import { ClassConstructor, plainToClass } from 'class-transformer';
import { StringUtils } from '@base/common/utils/string.util';

const hydration = <T>(
  entity: ClassConstructor<T>,
  raw: Record<string, unknown>,
  prefix?: string,
) => {
  prefix = prefix || '';
  let transformData: Record<string, unknown> = {};
  Object.keys(raw).map((key) => {
    if (key.slice(0, prefix.length + 1) == `${prefix}_`) {
      transformData = {
        ...transformData,
        [StringUtils.snakeToCamel(key.slice(prefix.length + 1, key.length))]:
          raw[key],
      };
    }
  });
  return plainToClass(entity, transformData);
};

export { hydration };
