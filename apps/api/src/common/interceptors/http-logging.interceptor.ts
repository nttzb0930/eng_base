import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import {
  attachRequestId,
  getRequestMetadata,
  type RequestWithMetadata,
} from "../http/request-metadata";
import { ApplicationLogger } from "../logging";

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: ApplicationLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>() as RequestWithMetadata;
    const response = http.getResponse<Response>();
    attachRequestId(request, response);
    const startedAt = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info(
            "HTTP request completed",
            {
              ...getRequestMetadata(request, response),
              operation: `${request.method} ${request.originalUrl || request.url}`,
              outcome: "completed",
              durationMs: Number((performance.now() - startedAt).toFixed(2)),
            },
            "HTTP"
          );
        },
      })
    );
  }
}
