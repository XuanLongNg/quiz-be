import { BaseEntityWithDelete } from '@/base/entities/base.entity';
import { User } from '@/base/entities/user.entity';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuthProvider } from '@/modules/auth/constants/auth.constant';

@Entity('accounts')
export class Account extends BaseEntityWithDelete {
  @PrimaryGeneratedColumn('uuid')
  @Index()
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.id)
  user: User;

  @Column()
  authProvider: AuthProvider;

  @Column({ nullable: false, unique: true })
  providerId: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: false, default: false })
  isEmailVerified: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastLoginAt?: Date;
}
