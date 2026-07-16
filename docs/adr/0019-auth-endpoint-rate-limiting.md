# ADR 0019: Rate Limit Authentication at the HTTP Seam

## Status

Accepted

## Context

Authentication endpoints were protected by credential validation but accepted
unbounded login, registration, and refresh attempts. The EC reference registers
`@nestjs/throttler` globally from `config/rate-limit.config.ts`; its current
Implementation limits by IP only and does not apply separate login identity or
refresh-session policies.

English Base needs the EC filesystem profile while also protecting the actual
Authentication session Interface against brute force and token replay bursts.
Rate limiting is HTTP delivery infrastructure, not Auth business behavior.

## Decision

- Runtime values live in `config/rate-limit.config.ts` and are validated at
  startup.
- Throttler composition and trackers live under `common/rate-limit`; the global
  guard lives under `common/guards` and is registered in `app.module.ts`.
- Auth controllers declare only an `AuthRateLimit` delivery policy. Auth use
  cases do not count requests or learn HTTP/IP details.
- Learner and Admin login are limited independently by IP and normalized login
  identity. Identity trackers are one-way hashes and are never logged.
- Registration is limited by IP. Refresh is limited by IP and a one-way hash of
  the refresh-session token, falling back to IP when no token is present.
- Rejected requests return `429`, stable code `RATE_LIMIT_EXCEEDED`, a
  `retryAfterSeconds` body field, and the standard `Retry-After` header.
- Passwords, authorization headers, cookies, sessions, and tokens remain
  recursively redacted by centralized logging under ADR 0017.
- The default storage Adapter is process-local, matching the EC baseline. A
  shared storage Adapter is required before running more than one API replica.

## Consequences

- Abuse protection has Locality at the HTTP seam and does not widen the Auth
  Interface.
- Different identifiers cannot bypass the IP policy, while distributed IPs
  cannot bypass the login-identity policy within one API replica.
- Tests exercise the public 429 contract and prove tracker values do not expose
  usernames or refresh tokens.
- Multi-replica deployment must introduce a shared Throttler storage Adapter
  (for example Redis) without changing controllers or Auth use cases.

