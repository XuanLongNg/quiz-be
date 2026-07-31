import {
  IFilter,
  IServiceOption,
} from '@base/apis/services/base-common.service';
import { BaseCreateOrUpdateService } from '@base/apis/services/base-create-or-update.service';
import { AppException } from '@base/common/errors/app.exception';
import { IAuditLogOptions } from '@base/interfaces/audit-log.interface';
import { omit } from 'lodash';
import { FindOptionsWhere, ObjectLiteral } from 'typeorm';
import { FindManyOptions } from 'typeorm/find-options/FindManyOptions';
import { FindOneOptions } from 'typeorm/find-options/FindOneOptions';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export class BaseDeleteService<
  T extends ObjectLiteral,
> extends BaseCreateOrUpdateService<T> {
  async delete(
    uid: string,
    options?: FindManyOptions<T> & IServiceOption & IAuditLogOptions,
  ): Promise<T[]> {
    const filters = options?.where as FindOptionsWhere<T>;
    try {
      const { data: oldRecords } = await this.find(options);

      const doc = (await this.preDelete(uid, options)) as unknown as Partial<T>;
      await this.repository.update(filters, {
        ...doc,
        updateUserId: uid,
        deleteTimestamp: new Date(),
        deleteUserId: uid,
        isActive: false,
      });

      const result = await this.postDelete(uid, options);

      // Audit logging
      if (
        options?.auditLogWriter &&
        options?.entityType &&
        oldRecords.length > 0
      ) {
        for (const oldRecord of oldRecords) {
          if (oldRecord.id) {
            await options.auditLogWriter.logDelete(
              options.entityType,
              String(oldRecord.id),
              oldRecord,
              options.currentUser,
              undefined,
              options.ipAddress,
              options.userAgent,
            );
          }
        }
      }

      return result;
    } catch (e: unknown) {
      this.logger.error(e);
      throw AppException.from(e);
    }
  }

  async restore(
    uid: string,
    options?: FindManyOptions<T> & IServiceOption & IAuditLogOptions,
  ): Promise<T[]> {
    const filters = options?.where as FindOptionsWhere<T>;
    try {
      const doc = (await this.preRestore(uid, options)) as T[] | null;
      await this.repository.update(filters, {
        ...doc,
        updateUserId: uid,
        deleteTimestamp: null,
        deleteUserId: null,
        isActive: true,
      } as QueryDeepPartialEntity<T>);

      const result = await this.postRestore(uid, options);

      // Audit logging
      if (options?.auditLogWriter && options?.entityType && result.length > 0) {
        for (const record of result) {
          if (record.id) {
            await options.auditLogWriter.logRestore(
              options.entityType,
              String(record.id),
              options.currentUser,
              undefined,
              options.ipAddress,
              options.userAgent,
            );
          }
        }
      }

      return result;
    } catch (e: unknown) {
      this.logger.error(e);
      throw AppException.from(e);
    }
  }

  protected async preRestore(
    _uid: string,
    _options?: FindManyOptions<T> & IServiceOption,
  ) {
    return null;
  }

  protected async postRestore(
    uid: string,
    options?: FindManyOptions<T> & IServiceOption,
  ) {
    const { data: record } = await this.find({
      ...options,
    });
    return record;
  }

  protected async preDelete(
    _uid: string,
    _options?: FindManyOptions<T> & IServiceOption,
  ) {
    return null;
  }

  protected async postDelete(
    uid: string,
    options?: FindManyOptions<T> & IServiceOption,
  ): Promise<T[]> {
    const { data: record } = await this.find({
      ...options,
      hasBaseEntityField: true,
      withDeleted: true,
    });
    return record;
  }

  protected postFind(
    data: T[],
    options: FindManyOptions<T> & IServiceOption & IFilter,
  ) {
    if (options.hasBaseEntityField || !data)
      return super.postFind(data, options);
    return super.postFind(
      data.map((rawData) => {
        return omit(rawData as object, [
          'deleteTimestamp',
          'deleteUserId',
        ]) as T;
      }),
      options,
    );
  }

  protected async postFindOne(
    data: T,
    options: FindOneOptions<T> & IServiceOption,
  ): Promise<T | null> {
    if (options.hasBaseEntityField || !data)
      return super.postFindOne(data, options);

    return super.postFindOne(
      omit(data as object, ['deleteTimestamp', 'deleteUserId']) as T,
      options,
    );
  }
}
