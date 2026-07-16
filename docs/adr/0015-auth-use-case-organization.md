# ADR 0015: Organize Authentication by Use Case

## Status

Accepted

## Context

Authentication delivery previously duplicated login behavior between learner
and Admin controllers. The learner controller also queried Prisma, verified
passwords, signed tokens, persisted refresh sessions, and managed cookies in one
file. Guards and request context were exported from the Auth root alongside
cryptographic helper functions, making the Auth Interface nearly as broad as
its Implementation.

The EC reference separates authentication behavior into use cases and token
services while placing Nest guards and request identity infrastructure under
`common`. English Base needs the same ownership model but does not currently
need EC verification, email, or Redis workflows.

## Decision

Use this Auth profile:

```text
src/module/auth/
  auth.controller.ts
  admin-auth.controller.ts
  auth.module.ts
  dto/
  service/
    auth-token.service.ts
    password.service.ts
  use-cases/
    login-user.usecase.ts
    register-user.usecase.ts
    refresh-token.usecase.ts
    logout-user.usecase.ts
  tests/

src/common/
  guards/
  auth-context/
```

- Learner and Admin login share `LoginUserUseCase`; the required role selects
  the existing response Interface.
- `/admin/auth/login` remains unchanged but its controller is composed by the
  Auth Module.
- Controllers own HTTP cookies and request extraction. Use cases own
  authentication flow and persistence coordination.
- `AuthTokenService` owns token creation/verification. `PasswordService` owns
  password hashing/verification.
- Guards and AsyncLocalStorage request context remain compatibility delivery
  infrastructure under `common`.
- The Auth root exports only `AuthModule`, `AuthTokenService`, and
  `PasswordService`. Use cases remain private to Auth delivery composition.

## Consequences

- Login policy has one owner for Learner and Admin callers.
- Controller tests can lock HTTP routes while use-case tests lock authentication
  and refresh-session behavior.
- Token/password changes have locality behind small Interfaces.
- Existing business Modules still call the compatibility `auth()` context; a
  later migration may pass Learner identity explicitly through behavior
  Interfaces without mixing that change into this refactor.
- Endpoint paths, response shapes, Prisma schema, and stored data do not change.
