import { BaseDeleteService } from '@base/apis/services/base-delete.service';
import { ObjectLiteral } from 'typeorm';

export class BaseService<
  T extends ObjectLiteral,
> extends BaseDeleteService<T> {}
