import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";

import { runWithAuth } from "./request-auth";
import type { AuthenticatedRequest } from "./user-jwt.guard";

/**
 * Wraps the entire request execution inside requestAuth.run() so that
 * AsyncLocalStorage properly propagates the userId to all service methods
 * called downstream. The guard sets request.auth.userId; this interceptor
 * reads it and binds it to the async context before the controller runs.
 */
@Injectable()
export class AuthContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Partial<AuthenticatedRequest>>();

    const userId = request.auth?.userId;

    if (!userId) {
      return next.handle();
    }

    return new Observable((observer) => {
      runWithAuth({ userId }, () => {
        next.handle().subscribe(observer);
      });
    });
  }
}
