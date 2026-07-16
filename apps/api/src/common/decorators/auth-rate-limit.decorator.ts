import { SetMetadata } from "@nestjs/common";

export const AUTH_RATE_LIMIT_POLICY = "authRateLimitPolicy";

export type AuthRateLimitPolicy = "login" | "register" | "refresh";

export const AuthRateLimit = (policy: AuthRateLimitPolicy) =>
  SetMetadata(AUTH_RATE_LIMIT_POLICY, policy);

