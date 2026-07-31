import {
  BaseCommonService,
  IFilter,
  IServiceOption,
} from '@base/apis/services/base-common.service';
import { AppException } from '@base/common/errors/app.exception';
import { IAuditLogOptions } from '@base/interfaces/audit-log.interface';
import { omit } from 'lodash';
import { DeepPartial, FindOptionsWhere, ObjectLiteral } from 'typeorm';
import { FindManyOptions } from 'typeorm/find-options/FindManyOptions';
import { FindOneOptions } from 'typeorm/find-options/FindOneOptions';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export class BaseCreateOrUpdateService<
  T extends ObjectLiteral,
> extends BaseCommonService<T> {
  async createOne(
    uid: string,
    dto: any,
    options?: FindOneOptions<T> & IServiceOption & IAuditLogOptions,
  ): Promise<T> {
    try {
      const doc = (await this.preCreateOne(uid, dto, options)) as T;
      const record = await this.repository.save(doc);
      const result = await this.postCreateOne(record, doc, options);

      // Audit logging
      if (options?.auditLogWriter && options?.entityType && record.id) {
        await options.auditLogWriter.logCreate(
          options.entityType,
          String(record.id),
          record,
          options.currentUser,
          undefined,
          options.ipAddress,
          options.userAgent,
        );
      }

      return result;
    } catch (e: unknown) {
      this.logger.error(e);
      throw AppException.from(e);
    }
  }

  async create(
    uid: string,
    dto: any,
    options?: FindManyOptions<T> & IServiceOption,
  ): Promise<T[]> {
    try {
      const doc = (await this.preCreate(uid, dto as any[], options)) as T[];
      const record = await this.repository.save(doc);
      return await this.postCreate(record, doc, options);
    } catch (e: unknown) {
      this.logger.error(e);
      throw AppException.from(e);
    }
  }

  async update(
    uid: string,
    dto: any,
    options?: FindManyOptions<T> & IServiceOption & IFilter & IAuditLogOptions,
  ): Promise<T[]> {
    const filters = options?.where as FindOptionsWhere<T>;
    try {
      const { data: oldRecord } = await this.find(options);
      if (oldRecord.length === 0) throw AppException.notFound();
      const doc = await this.preUpdate(uid, dto, oldRecord, options);
      await this.repository.update(filters, doc);
      const optionsProcessed = {
        ...options,
        where: {
          ...(omit(options?.where, 'updatedTimestamp') as FindOptionsWhere<T>),
        },
      } as FindManyOptions<T> & IServiceOption & IFilter;

      const { data: record } = await this.find(optionsProcessed);
      const result = this.postUpdate(record, dto, oldRecord, options);

      // Audit logging
      if (options?.auditLogWriter && options?.entityType) {
        for (let i = 0; i < record.length; i++) {
          if (record[i].id) {
            await options.auditLogWriter.logUpdate(
              options.entityType,
              String(record[i].id),
              oldRecord[i],
              record[i],
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

  protected async preCreateOrUpdate(
    dto: any,
    _oldRecord: T | T[] | null,
    _options?: (FindOneOptions<T> | FindManyOptions<T>) & IServiceOption,
  ): Promise<DeepPartial<T>> {
    return dto as DeepPartial<T>;
  }

  protected async postCreateOrUpdate(
    record: T | T[],
    _dto: any,
    _oldRecord: T | T[] | null,
    _options?: (FindOneOptions<T> | FindManyOptions<T>) & IServiceOption,
  ): Promise<T | T[]> {
    return record;
  }

  protected async preCreateOne(
    uid: string,
    dto: any,
    options?: FindOneOptions<T> & IServiceOption,
  ): Promise<DeepPartial<T>> {
    return await this.preCreateOrUpdate(
      {
        ...dto,
        createUserId: uid,
        updateUserId: uid,
      },
      null,
      options,
    );
  }

  protected async postCreateOne(
    record: T,
    dto: any,
    options?: FindOneOptions<T> & IServiceOption,
  ): Promise<T> {
    return (await this.postCreateOrUpdate(record, dto, null, options)) as T;
  }

  protected async preCreate(
    uid: string,
    dto: any[],
    options?: FindManyOptions<T> & IServiceOption,
  ): Promise<DeepPartial<T>[]> {
    const processedDto = (dto as unknown[]).map((data: unknown) => ({
      ...(data as object),
      createUserId: uid,
      updateUserId: uid,
    }));
    return (await this.preCreateOrUpdate(
      processedDto,
      null,
      options,
    )) as unknown as DeepPartial<T>[];
  }

  protected async postCreate(
    record: T[],
    dto: any[],
    options?: FindManyOptions<T> & IServiceOption,
  ): Promise<T[]> {
    return (await this.postCreateOrUpdate(record, dto, null, options)) as T[];
  }

  protected async preUpdate(
    uid: string,
    dto: any,
    oldRecord: T[],
    options?: FindManyOptions<T> & IServiceOption,
  ): Promise<QueryDeepPartialEntity<T>> {
    return (await this.preCreateOrUpdate(
      {
        ...dto,
        updateUserId: uid,
      },
      oldRecord,
      options,
    )) as QueryDeepPartialEntity<T>;
  }

  protected async postUpdate(
    record: T[],
    dto: any,
    oldRecord: T[],
    options?: FindManyOptions<T> & IServiceOption,
  ): Promise<T[]> {
    return (await this.postCreateOrUpdate(
      record,
      dto,
      oldRecord,
      options,
    )) as T[];
  }
}
