export interface IPaginationResponse {
  page: number;
  take: number;
  itemCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface IFilterResponse {
  k?: string;
  sortBy?: string[];
  sortDes?: boolean[];
  filterBy?: string[];
}

export interface IResponse<T> {
  data: T;
  metadata: {
    pagination?: IPaginationResponse;
    filter?: IFilterResponse;
  };
  message?: string;
  error?: any[];
  code: string;
}
