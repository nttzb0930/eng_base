import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";

import type { AuthenticatedRequest } from "../guards/user-jwt.guard";

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.auth?.userId;
    if (!userId) throw new UnauthorizedException("TOKEN_INVALID");
    return userId;
  }
);
