import { createHash } from "node:crypto";
import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { AUTH_COOKIE_NAMES } from "../http/auth-cookie.constants";
import {
  AUTH_RATE_LIMIT_POLICY,
  type AuthRateLimitPolicy,
} from "../decorators/auth-rate-limit.decorator";

export function readAuthRateLimitPolicy(
  context: ExecutionContext
): AuthRateLimitPolicy | undefined {
  return Reflect.getMetadata(AUTH_RATE_LIMIT_POLICY, context.getHandler()) as
    AuthRateLimitPolicy | undefined;
}

export function requestIp(request: Request) {
  return request.ip || request.socket?.remoteAddress || "unknown";
}

export function loginIdentity(request: Request) {
  const body = request.body as { username?: unknown } | undefined;
  const username =
    typeof body?.username === "string"
      ? body.username.trim().toLowerCase()
      : "missing";
  return opaqueTracker(username);
}

export function refreshSession(request: Request) {
  const cookie = request.headers.cookie
    ?.split(";")
    .map((item) => item.trim().split("="))
    .find(([key]) => key === AUTH_COOKIE_NAMES.refresh);
  const token = cookie ? decodeURIComponent(cookie.slice(1).join("=")) : "";
  return token ? opaqueTracker(token) : `ip:${requestIp(request)}`;
}

function opaqueTracker(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
