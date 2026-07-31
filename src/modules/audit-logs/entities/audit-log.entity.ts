import { AuditAction } from '@base/common/constants/app.constant';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['userId'])
@Index(['action'])
@Index(['timestamp'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'varchar',
    length: 255,
  })
  entityType: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  entityId: string;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  userId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  userEmail?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  userFullName?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  oldValues?: any;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  newValues?: any;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  changes?: any;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  ipAddress?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  userAgent?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: any;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    precision: 3,
  })
  timestamp: Date;
}
