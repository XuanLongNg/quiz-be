import { Column, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntityWithDelete } from '@/base/entities/base.entity';
import { UserGender } from '@/base/common/constants/app.constant';

export class User extends BaseEntityWithDelete {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  username: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    nullable: true,
  })
  phoneNumber?: string;

  @Column()
  gender: UserGender;

  @Column()
  avatarId: string;

  @Column()
  isEmailVerified: boolean;

  @Column()
  isPhoneVerified: boolean;
}
