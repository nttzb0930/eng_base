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

Authentication needs goal-specific use cases and token services, while Nest
guards and request identity remain cross-capability HTTP infrastructure. The
current product does not require verification-email or distributed-session
workflows.

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
  decorators/
    current-user-id.decorator.ts
```

- Learner and Admin login share `LoginUserUseCase`; the required role selects
  the existing response Interface.
- `/admin/auth/login` remains unchanged but its controller is composed by the
  Auth Module.
- Controllers own HTTP cookies and request extraction. Use cases own
  authentication flow and persistence coordination.
- `AuthTokenService` owns token creation/verification. `PasswordService` owns
  password hashing/verification.
- Guards verify credentials and attach claims to the HTTP request. Controllers
  extract the required actor identifier through `CurrentUserId` and pass it
  explicitly into actor-dependent behavior Interfaces.
- Ambient identity through AsyncLocalStorage, globals, mutable singletons, or an
  `auth()` accessor is forbidden, including as a temporary compatibility layer.
- The Auth root exports only `AuthModule`, `AuthTokenService`, and
  `PasswordService`. Use cases remain private to Auth delivery composition.

## Consequences

- Login policy has one owner for Learner and Admin callers.
- Controller tests can lock HTTP routes while use-case tests lock authentication
  and refresh-session behavior.
- Token/password changes have locality behind small Interfaces.
- Actor-dependent behavior makes identity visible in its method/command input,
  so authorization and ownership tests do not depend on hidden request state.
- Endpoint paths, response shapes, Prisma schema, and stored data do not change.
