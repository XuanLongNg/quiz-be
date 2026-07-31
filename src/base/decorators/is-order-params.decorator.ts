import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsOrderParams(
  validFields: string[],
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isSortingParams',
      target: object.constructor,
      propertyName,
      constraints: validFields,
      options: {
        ...validationOptions,
        each: true,

        message: `${propertyName} must be a list of string formatted as 'property:(ASC|DESC)', where 'property' accepts: [${validFields.map((field) => `'${field}'`).join(', ')}]`,
      },
      validator: {
        validate(value: string) {
          const isValueString = typeof value === 'string';
          const isValueMatchPattern = new RegExp(
            `^${validFields.join('|')}:(ASC|DESC)$`,
            'g',
          ).test(value);
          return isValueString && isValueMatchPattern;
        },
      },
    });
  };
}
