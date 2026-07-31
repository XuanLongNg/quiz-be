import {
  BaseCommonService,
  IGetListData,
} from '@base/apis/services/base-common.service';
import { AuditAction } from '@base/common/constants/app.constant';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindManyOptions,
  FindOperator,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { AuditLogFilterDto } from '@/modules/audit-logs/dto/audit-log-filter.dto';
import { CreateAuditLogDto } from '@/modules/audit-logs/dto/create-audit-log.dto';
import { AuditLog } from '@/modules/audit-logs/entities/audit-log.entity';

@Injectable()
export class AuditLogService extends BaseCommonService<AuditLog> {
  constructor(
    @InjectRepository(AuditLog)
    protected readonly repository: Repository<AuditLog>,
  ) {
    super(repository, new Logger(AuditLogService.name));
  }

  async create(auditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const auditLog = this.repository.create(auditLogDto);
      return await this.repository.save(auditLog);
    } catch (e: unknown) {
      this.logger.error('Failed to create audit log', e);
      throw e;
    }
  }

  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.repository.find({
      where: {
        entityType,
        entityId,
      },
      order: {
        timestamp: 'DESC',
      },
    });
  }

  async findByUser(
    userId: string,
    options?: FindManyOptions<AuditLog> & {
      filters?: { page?: number; pageSize?: number };
    },
  ): Promise<IGetListData<AuditLog>> {
    const findOptions: FindManyOptions<AuditLog> & {
      filters?: { page?: number; pageSize?: number };
    } = {
      where: {
        userId,
        ...options?.where,
      },
      order: {
        timestamp: 'DESC',
      },
      filters: options?.filters,
      ...options,
    };
    return this.find(findOptions);
  }

  async findByAction(
    action: AuditAction,
    options?: FindManyOptions<AuditLog>,
  ): Promise<AuditLog[]> {
    return this.repository.find({
      where: {
        action,
        ...options?.where,
      },
      order: {
        timestamp: 'DESC',
      },
      ...options,
    });
  }

  async findWithFilters(
    filters: AuditLogFilterDto,
  ): Promise<IGetListData<AuditLog>> {
    const where: Partial<AuditLog> = {};

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    type TimestampFilter =
      FindOperator<Date> | [FindOperator<Date>, FindOperator<Date>];
    const dateFilter: { timestamp?: TimestampFilter } = {};
    if (filters.startDate) {
      dateFilter.timestamp = MoreThanOrEqual(new Date(filters.startDate));
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (dateFilter.timestamp) {
        const startCondition = dateFilter.timestamp as FindOperator<Date>;
        dateFilter.timestamp = [startCondition, LessThanOrEqual(endDate)];
      } else {
        dateFilter.timestamp = LessThanOrEqual(endDate);
      }
    }

    const baseWhere: Record<string, unknown> = {
      ...where,
      ...dateFilter,
    };

    const options: FindManyOptions<AuditLog> & {
      hasBaseEntityField?: boolean;
      filters?: AuditLogFilterDto;
    } = {
      where: baseWhere,
      order: {
        timestamp: 'DESC',
      },
      filters: filters,
    };

    return this.find(options);
  }

  async getEntityHistory(
    entityType: string,
    entityId: string,
    options?: FindManyOptions<AuditLog> & {
      filters?: { page?: number; pageSize?: number };
    },
  ): Promise<IGetListData<AuditLog>> {
    const findOptions: FindManyOptions<AuditLog> & {
      filters?: { page?: number; pageSize?: number };
    } = {
      where: {
        entityType,
        entityId,
      },
      order: {
        timestamp: 'DESC',
      },
      filters: options?.filters,
      ...options,
    };
    return this.find(findOptions);
  }
}
