import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ThrottlerStorage } from "@nestjs/throttler";
import type { Request, Response } from "express";

import { RateLimitExceededException } from "../http/rate-limit-exceeded.exception";
import type { AuthenticatedRequest } from "./user-jwt.guard";

type WritingAiRateLimitConfiguration = {
  userLimit: number;
  ipLimit: number;
  ttlMs: number;
};

@Injectable()
export class WritingAiRateLimitGuard implements CanActivate {
  constructor(
    @Inject(ThrottlerStorage)
    private readonly storage: ThrottlerStorage,
    private readonly config: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest & Request>();
    const response = http.getResponse<Response>();
    const userId = request.auth?.userId;
    if (!userId) throw new UnauthorizedException("TOKEN_INVALID");
    const limits = this.config.get<WritingAiRateLimitConfiguration>(
      "rateLimit.writingAi"
    );
    if (!limits)
      throw new Error("Writing AI rate-limit configuration is missing");
    const ip = request.ip || request.socket?.remoteAddress || "unknown";
    const [user, network] = await Promise.all([
      this.storage.increment(
        `writing-ai:user:${userId}`,
        limits.ttlMs,
        limits.userLimit,
        limits.ttlMs,
        "writingAiUser"
      ),
      this.storage.increment(
        `writing-ai:ip:${ip}`,
        limits.ttlMs,
        limits.ipLimit,
        limits.ttlMs,
        "writingAiIp"
      ),
    ]);
    const blocked = [user, network].filter((record) => record.isBlocked);
    if (blocked.length) {
      const retryAfter = Math.max(
        1,
        ...blocked.map((record) => Math.ceil(record.timeToBlockExpire / 1000))
      );
      response.setHeader("Retry-After", String(retryAfter));
      throw new RateLimitExceededException(retryAfter);
    }
    return true;
  }
}
