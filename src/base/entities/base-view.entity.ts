import { ViewColumn } from 'typeorm';

export class BaseViewEntity {
  @ViewColumn()
  createTimestamp: Date;

  @ViewColumn()
  updateTimestamp: Date;

  @ViewColumn()
  createUserId: string;

  @ViewColumn()
  updateUserId: string;
}

export class BaseViewEntityWithDelete extends BaseViewEntity {
  @ViewColumn()
  isActive: boolean;

  @ViewColumn()
  deleteTimestamp?: Date;

  @ViewColumn()
  deleteUserId?: string;
}
