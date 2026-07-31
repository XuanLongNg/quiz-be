import { SYSTEM_USER_ID } from '@/base/common/constants/system.constants';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export class BaseEntity {
  @CreateDateColumn({
    type: 'timestamp with time zone',
    precision: 3,
    nullable: true,
  })
  createTimestamp: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    precision: 3,
    nullable: true,
  })
  updateTimestamp: Date;

  @Column({
    type: 'uuid',
    default: SYSTEM_USER_ID,
  })
  createUserId: string;

  @Column({
    type: 'uuid',
    default: SYSTEM_USER_ID,
  })
  updateUserId: string;
}

export class BaseEntityWithDelete extends BaseEntity {
  @Column({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @DeleteDateColumn({
    type: 'timestamp with time zone',
    precision: 3,
    nullable: true,
  })
  deleteTimestamp?: Date;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  deleteUserId?: string;
}
