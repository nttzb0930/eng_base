import { ConfigService } from "@nestjs/config";
import type { ThrottlerModuleOptions } from "@nestjs/throttler";
import type { Request } from "express";

import {
  loginIdentity,
  readAuthRateLimitPolicy,
  refreshSession,
  requestIp,
} from "./auth-rate-limit";

type RateLimitConfiguration = {
  global: { limit: number; ttlMs: number };
  login: { ipLimit: number; identityLimit: number; ttlMs: number };
  register: { ipLimit: number; ttlMs: number };
  refresh: { ipLimit: number; sessionLimit: number; ttlMs: number };
};

export function createRateLimitOptions(
  config: ConfigService
): ThrottlerModuleOptions {
  const limits = config.get<RateLimitConfiguration>("rateLimit");
  if (!limits) throw new Error("Rate-limit configuration is missing");

  const authLimit = (
    policy: ReturnType<typeof readAuthRateLimitPolicy>,
    kind: "ip" | "identity" | "session"
  ) => {
    if (policy === "login") {
      return kind === "identity"
        ? limits.login.identityLimit
        : limits.login.ipLimit;
    }
    if (policy === "register") return limits.register.ipLimit;
    return kind === "session"
      ? limits.refresh.sessionLimit
      : limits.refresh.ipLimit;
  };
  const authTtl = (policy: ReturnType<typeof readAuthRateLimitPolicy>) =>
    policy === "login"
      ? limits.login.ttlMs
      : policy === "register"
        ? limits.register.ttlMs
        : limits.refresh.ttlMs;

  return [
    {
      name: "default",
      limit: limits.global.limit,
      ttl: limits.global.ttlMs,
    },
    {
      name: "authIp",
      skipIf: (context) => !readAuthRateLimitPolicy(context),
      limit: (context) => authLimit(readAuthRateLimitPolicy(context), "ip"),
      ttl: (context) => authTtl(readAuthRateLimitPolicy(context)),
      getTracker: (request) => requestIp(request as Request),
    },
    {
      name: "authIdentity",
      skipIf: (context) => readAuthRateLimitPolicy(context) !== "login",
      limit: (context) =>
        authLimit(readAuthRateLimitPolicy(context), "identity"),
      ttl: (context) => authTtl(readAuthRateLimitPolicy(context)),
      getTracker: (request) => loginIdentity(request as Request),
    },
    {
      name: "authSession",
      skipIf: (context) => readAuthRateLimitPolicy(context) !== "refresh",
      limit: (context) =>
        authLimit(readAuthRateLimitPolicy(context), "session"),
      ttl: (context) => authTtl(readAuthRateLimitPolicy(context)),
      getTracker: (request) => refreshSession(request as Request),
    },
  ];
}

