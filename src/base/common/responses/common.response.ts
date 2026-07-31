import { IPagination } from '@base/common/types/pagination.types';

class ResponseSuccess<T> {
  data: T;
  meta?: {
    pagination?: IPagination;
    filter?: Record<string, any>;
  };
}

class ResponseFailed {
  statusCode: number;
  message: string;
}
export { ResponseSuccess, ResponseFailed };
