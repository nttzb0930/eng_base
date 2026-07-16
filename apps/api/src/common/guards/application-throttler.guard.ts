import {
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import {
  ThrottlerGuard,
  type ThrottlerLimitDetail,
} from "@nestjs/throttler";
import type { Response } from "express";
import { RateLimitExceededException } from "../http/rate-limit-exceeded.exception";

@Injectable()
export class ApplicationThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail
  ): Promise<void> {
    const response = context.switchToHttp().getResponse<Response>();
    const retryAfterSeconds = Math.max(1, detail.timeToBlockExpire);

    response.setHeader("Retry-After", String(retryAfterSeconds));
    throw new RateLimitExceededException(retryAfterSeconds);
  }
}
