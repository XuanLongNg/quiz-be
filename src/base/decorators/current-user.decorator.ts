import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestCustom } from '@base/common/types/request-custom';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestCustom>();
    return request.user;
  },
);
