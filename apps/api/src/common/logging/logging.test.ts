import assert from "node:assert/strict";
import test from "node:test";
import type { ArgumentsHost } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { AllExceptionsFilter } from "../filters/all-exceptions.filter";
import type {
  ApplicationLogger,
  LogMetadata,
} from "./application-logger.service";
import { redactLogValue } from "./log-redaction";

test("logging redacts credentials recursively without losing safe metadata", () => {
  assert.deepEqual(
    redactLogValue({
      requestId: "req-1",
      password: "secret",
      nested: {
        refreshToken: "refresh-secret",
        cookieNames: ["access_token", "refresh_token"],
        role: "USER",
      },
      authorizationHeader: "Bearer access-secret",
    }),
    {
      requestId: "req-1",
      password: "[REDACTED]",
      nested: {
        refreshToken: "[REDACTED]",
        cookieNames: "[REDACTED]",
        role: "USER",
      },
      authorizationHeader: "[REDACTED]",
    }
  );
});

function createHttpHost() {
  const result: {
    status?: number;
    body?: unknown;
    headers: Record<string, string>;
  } = {
    headers: {},
  };
  const request = {
    method: "POST",
    originalUrl: "/api/auth/refresh",
    url: "/api/auth/refresh",
    ip: "127.0.0.1",
    header(name: string) {
      return name === "user-agent" ? "test-agent" : undefined;
    },
  } as unknown as Request;
  const responseImplementation: {
    statusCode: number;
    setHeader: (name: string, value: string) => void;
    status: (status: number) => typeof responseImplementation;
    json: (body: unknown) => typeof responseImplementation;
  } = {
    statusCode: 200,
    setHeader(name: string, value: string) {
      result.headers[name] = value;
    },
    status(status: number) {
      result.status = status;
      this.statusCode = status;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
  };
  const response = responseImplementation as unknown as Response;
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as unknown as ArgumentsHost;
  return { host, result };
}

function createLoggerFake() {
  const entries: Array<{
    level: "warn" | "error";
    message: string;
    metadata: LogMetadata;
  }> = [];
  const logger = {
    warn(message: string, metadata: LogMetadata) {
      entries.push({ level: "warn", message, metadata });
    },
    error(message: string, metadata: LogMetadata) {
      entries.push({ level: "error", message, metadata });
    },
  } as ApplicationLogger;
  return { logger, entries };
}

test("exception filter preserves public Auth response and logs internal reason", () => {
  const { logger, entries } = createLoggerFake();
  const filter = new AllExceptionsFilter(logger);
  const { host, result } = createHttpHost();
  const exception = new UnauthorizedException("REFRESH_TOKEN_INVALID");
  exception.cause = new Error("session_mismatch");

  filter.catch(exception, host);

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, {
    message: "REFRESH_TOKEN_INVALID",
    error: "Unauthorized",
    statusCode: 401,
    requestId: result.headers["x-request-id"],
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.level, "warn");
  assert.equal(entries[0]?.metadata.reason, "session_mismatch");
});

test("exception filter hides unexpected error details and logs once", () => {
  const { logger, entries } = createLoggerFake();
  const filter = new AllExceptionsFilter(logger);
  const { host, result } = createHttpHost();

  filter.catch(new Error("database password leaked"), host);

  assert.equal(result.status, 500);
  assert.deepEqual(result.body, {
    statusCode: 500,
    message: "Internal server error",
    error: "Internal Server Error",
    requestId: result.headers["x-request-id"],
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.level, "error");
});

test("exception filter preserves known Prisma response mapping", () => {
  const { logger, entries } = createLoggerFake();
  const filter = new AllExceptionsFilter(logger);
  const { host, result } = createHttpHost();
  const exception = new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed on password=secret",
    { code: "P2002", clientVersion: "test" }
  );

  filter.catch(exception, host);

  assert.equal(result.status, 409);
  assert.deepEqual(result.body, {
    statusCode: 409,
    message: "Record already exists (unique constraint violation)",
    error: "P2002",
    requestId: result.headers["x-request-id"],
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.level, "warn");
  assert.doesNotMatch(JSON.stringify(entries), /secret/);
});
