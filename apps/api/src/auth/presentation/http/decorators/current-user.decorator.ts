import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@boardgame/shared';

export type { AuthUser };

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
