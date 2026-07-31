import { AppException } from '@base/common/errors/app.exception';
import { FilterDto } from '@base/dtos/filter.dto';
import {
  IFilterResponse,
  IPaginationResponse,
} from '@base/interfaces/app.interfaces';
import { Logger } from '@nestjs/common';
import { ObjectLiteral, Raw, Repository } from 'typeorm';
import { FindManyOptions } from 'typeorm/find-options/FindManyOptions';
import { FindOneOptions } from 'typeorm/find-options/FindOneOptions';
import { FindOptionsOrder } from 'typeorm/find-options/FindOptionsOrder';
import { FindOptionsWhere } from 'typeorm/find-options/FindOptionsWhere';

export interface IFilter {
  filters?: Partial<FilterDto>;
}

export interface IServiceOption {
  hasBaseEntityField?: boolean;
}

export interface IGetListData<T> {
  data: T[];
  metadata: {
    pagination: IPaginationResponse;
    filters: IFilterResponse;
  };
}

export class BaseCommonService<T extends ObjectLiteral> {
  protected logger: Logger;

  constructor(
    protected readonly repository: Repository<T>,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  async find(
    options?: FindManyOptions<T> & IServiceOption & IFilter,
  ): Promise<IGetListData<T>> {
    const processedOptions = this.setDefaultValue(
      options,
    ) as FindManyOptions<T> & IServiceOption & IFilter;
    const optionsCustom = this.preFind(processedOptions);
    try {
      const data = await this.repository.find({
        ...(optionsCustom as FindManyOptions<T>),
      });
      return this.postFind(data, optionsCustom);
    } catch (e: unknown) {
      this.logger.error(e);
      throw AppException.from(e);
    }
  }

  async findOne(
    options: FindOneOptions<T> & IServiceOption,
  ): Promise<T | null> {
    const processedOptions = this.setDefaultValue(options);
    const customOptions = this.preFindOne(processedOptions);
    try {
      const data = await this.repository.findOne({
        ...customOptions,
      });
      return await this.postFindOne(data, processedOptions);
    } catch (e: unknown) {
      this.logger.error(e);
      throw AppException.from(e);
    }
  }

  async count(
    options?: FindManyOptions<T> & IServiceOption & IFilter,
  ): Promise<number> {
    const processedOptions = this.setDefaultValue(
      options,
    ) as FindManyOptions<T> & IServiceOption & IFilter;
    const customOptions = this.preCount(processedOptions);
    try {
      return await this.repository.count(customOptions);
    } catch (e: unknown) {
      this.logger.error(e);
      throw AppException.from(e);
    }
  }

  protected preFind(options: FindManyOptions<T> & IFilter & IServiceOption) {
    const { take, skip } = this.getPaginationProps(options);
    const where = this.getFilterProps(options);
    const order = this.getOrderProps(options);

    return {
      ...options,
      where,
      skip,
      take,
      order,
    };
  }

  protected async postFind(
    data: T[],
    options: FindManyOptions<T> & IServiceOption & IFilter,
  ) {
    const { page, pageSize, ...filters } = options.filters ?? {};
    return {
      data,
      metadata: {
        pagination: await this.getPaginationResponse(options),
        filters,
      },
    };
  }

  protected preFindOne(options: FindOneOptions<T> & IServiceOption) {
    return {
      ...options,
    } as FindOptionsWhere<T>;
  }

  protected async postFindOne(
    data: T | null,
    _options?: FindOneOptions<T> & IServiceOption,
  ): Promise<T | null> {
    return data;
  }

  protected getPaginationProps(
    options: FindManyOptions<T> & IFilter & IServiceOption,
  ) {
    const { filters } = options;
    const page = filters?.page || 1;
    const take = filters?.pageSize || 20;
    const skip = (page - 1) * take;
    return {
      take,
      skip,
    };
  }

  protected getFilterProps(
    options: FindManyOptions<T> & IFilter & IServiceOption,
  ): FindOptionsWhere<T>[] | FindOptionsWhere<T> {
    const { filters, where } = options;
    if (filters?.k) {
      const keyword = filters.k.toLowerCase();
      switch (Array.isArray(where)) {
        case true: {
          let customWhereArray: FindOptionsWhere<T>[] = [
            ...(where as FindOptionsWhere<T>[]),
          ];
          if (filters?.filterBy) {
            filters?.filterBy.forEach((field) => {
              customWhereArray = customWhereArray?.map((custom) => ({
                ...custom,
                [field]: Raw(
                  (alias) =>
                    `LOWER(CAST(${alias} AS TEXT)) like '%${keyword}%'`,
                ),
              }));
            });
          }
          return customWhereArray;
        }
        default: {
          let customWhere = {};
          if (filters?.filterBy) {
            filters?.filterBy.forEach((field) => {
              customWhere = {
                ...customWhere,
                [field]: Raw(
                  (alias) =>
                    `LOWER(CAST(${alias} AS TEXT)) like '%${keyword}%'`,
                ),
              };
            });
          }
          return { ...where, ...customWhere };
        }
      }
    }
    return {};
  }

  protected getOrderProps(
    options: FindManyOptions<T> & IFilter & IServiceOption,
  ): FindOptionsOrder<T> {
    const { filters, order } = options;
    let customSort: FindOptionsOrder<T> = {};
    if (filters?.orderBy) {
      const orderByArray = Array.isArray(filters.orderBy)
        ? filters.orderBy
        : [filters.orderBy];

      orderByArray.forEach((field) => {
        if (typeof field === 'string') {
          const splitFiled = field.split(':');
          customSort = {
            ...customSort,
            [splitFiled[0]]: splitFiled[1] || 'ASC',
          };
        }
      });
    }

    return { ...customSort, ...order };
  }

  protected preCount(options: FindManyOptions<T> & IFilter & IServiceOption) {
    const where = this.getFilterProps(options);
    return {
      ...options,
      where,
    };
  }

  protected async getPaginationResponse(
    options: FindManyOptions<T> & IServiceOption & IFilter,
  ) {
    const { filters } = options;
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    try {
      const { take, skip, ...countOptions } = options;

      const total = await this.count(countOptions);
      const totalPage = Math.ceil(total / pageSize);
      return {
        page,
        take: pageSize,
        itemCount: total,
        pageCount: totalPage,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPage,
      };
    } catch (e: unknown) {
      this.logger.error(e);
      throw AppException.from(e);
    }
  }

  private setDefaultValue(options?: IServiceOption & IFilter) {
    const hasBaseEntityField = options?.hasBaseEntityField ?? false;

    return {
      ...options,
      hasBaseEntityField,
    } as IServiceOption;
  }
}
