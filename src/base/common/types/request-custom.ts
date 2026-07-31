import { User } from '@/base/entities/user.entity';
import { Request as ExpressRequest } from 'express';

export interface RequestCustom extends ExpressRequest {
  user?: User;
}
