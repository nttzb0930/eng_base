import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerStorageService } from "@nestjs/throttler";
import type { Request, Response } from "express";

import { AuthRateLimit } from "../decorators/auth-rate-limit.decorator";
import { ApplicationThrottlerGuard } from "../guards/application-throttler.guard";
import { RateLimitExceededException } from "../http/rate-limit-exceeded.exception";
import {
  loginIdentity,
  readAuthRateLimitPolicy,
  refreshSession,
} from "./auth-rate-limit";

class TestController {
  @AuthRateLimit("login")
  login() {}
}

function createContext() {
  const headers: Record<string, string> = {};
  const request = {
    ip: "127.0.0.1",
    body: { username: "Learner-One" },
    headers: {},
  } as unknown as Request;
  const response = {
    header(name: string, value: string | number) {
      headers[name] = String(value);
    },
    setHeader(name: string, value: string | number) {
      headers[name] = String(value);
    },
  } as unknown as Response;
  const context = {
    getClass: () => TestController,
    getHandler: () => TestController.prototype.login,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { context, headers, request };
}

test("auth rate-limit metadata and trackers do not expose credentials", () => {
  const { context, request } = createContext();
  assert.equal(readAuthRateLimitPolicy(context), "login");
  assert.match(loginIdentity(request), /^[a-f0-9]{64}$/);
  assert.doesNotMatch(loginIdentity(request), /learner-one/i);

  request.headers.cookie = "client_refresh_token=refresh-secret";
  assert.match(refreshSession(request), /^[a-f0-9]{64}$/);
  assert.doesNotMatch(refreshSession(request), /refresh-secret/);
});

test("requests above the endpoint limit return stable 429 and Retry-After", async () => {
  const storage = new ThrottlerStorageService();
  const guard = new ApplicationThrottlerGuard(
    [{ name: "authIdentity", limit: 1, ttl: 60_000 }],
    storage,
    new Reflector()
  );
  await guard.onModuleInit();
  const { context, headers } = createContext();

  assert.equal(await guard.canActivate(context), true);
  await assert.rejects(
    () => guard.canActivate(context),
    (error: unknown) => {
      assert.ok(error instanceof RateLimitExceededException);
      assert.deepEqual(error.getResponse(), {
        statusCode: 429,
        error: "Too Many Requests",
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        retryAfterSeconds: 60,
      });
      assert.equal(headers["Retry-After"], "60");
      return true;
    }
  );
  storage.onApplicationShutdown();
});
