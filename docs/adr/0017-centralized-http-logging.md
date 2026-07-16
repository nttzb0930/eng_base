# ADR 0017: Centralize HTTP Logging and Exception Mapping

## Status

Accepted

## Context

The API only had a Prisma exception filter. Auth use cases exposed stable public
error codes but the server had no request ID, structured rejection reason, or
centralized unexpected-error log. Logging inside every use case would duplicate
delivery metadata and could leak passwords, tokens, cookies, or authorization
headers.

## Decision

- Cross-capability logging lives under `src/common/logging`.
- `HttpLoggingInterceptor` creates or validates `X-Request-Id`, records request
  duration, and logs successful requests only.
- `AllExceptionsFilter` is the single error-log owner. It maps Prisma,
  `HttpException`, and unexpected errors, logging 4xx as warnings and 5xx as
  errors.
- Log metadata is recursively redacted for password, token, cookie, session,
  secret, and authorization keys.
- Auth failures retain existing public codes. Safe internal reasons are carried
  through `Error.cause` for server logs and are not serialized to clients.
- Unexpected error messages and stack traces remain server-only.
- Error responses add `requestId` while preserving their existing status,
  message, error, and Auth code fields.

## Consequences

- Every failed HTTP request has one structured log and one request ID.
- Auth operators can distinguish internal rejection causes without enabling
  account enumeration in the public Interface.
- The former Prisma-only filter is replaced while its known error mappings are
  preserved.
- Logging transport can later be replaced behind `ApplicationLogger` without
  changing capability use cases.
