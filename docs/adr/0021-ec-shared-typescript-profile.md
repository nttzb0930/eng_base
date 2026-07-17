# ADR 0021: EC Shared TypeScript-Only Profile

## Status

Accepted on 2026-07-18.

## Context

`packages/shared` previously exposed two competing conventions. Most domains
forwarded TypeScript declarations from one `src/contracts.ts` file through
capability subpaths, while Course defined Zod schemas in
`src/courses/course.contract.ts`. A coder therefore had to choose between a
global contract bucket, a forwarding capability folder, and a schema-first
Course exception.

The repository uses EC as its reference profile. EC keeps reusable TypeScript
declarations and runtime constants in explicit shared folders and exposes a
small package Interface. English Base also retains runtime-specific validation
inside the runtime that owns it.

## Decision

`packages/shared` follows the EC TypeScript-only profile:

- domain TypeScript declarations live in `src/types/<domain>.ts`;
- framework-neutral runtime values live in `src/constants/<domain>.ts`;
- domain filenames are singular kebab-case;
- `index.ts` files export only and contain no behavior or declarations;
- all consumers import from the root `@repo/shared` Interface.

Shared does not validate HTTP responses at runtime. API mappers expose explicit
Shared return types. Nest DTO classes and `class-validator` continue to validate
incoming requests. Mapper, resource, integration, and architecture tests protect
the existing wire shape across API, Admin, and Web.

The following are forbidden:

- capability package subpaths such as `@repo/shared/courses`;
- `packages/shared/src/contracts.ts`;
- `*.contract.ts` files and Shared Zod wire schemas;
- Prisma models, Nest DTO classes, frontend ViewModels, HTTP clients, React
  hooks, or UI behavior inside Shared;
- empty `hooks`, `lib`, or `utils` folders without a real shared consumer.

API-owned Zod environment validation is unaffected. Prisma schema, migration,
and persistence validation are unaffected.

This decision supersedes only the Shared naming, schema, and export sections of
ADR 0012 and ADR 0013. Their domain ownership, runtime ownership, and HTTP
compatibility decisions remain accepted.

## Consequences

### Positive

- Coders learn one Shared layout and one import path.
- Domain declarations change close to related declarations instead of in a
  global technical bucket.
- Shared remains framework-neutral and has no Zod runtime dependency.
- Architecture tests prevent transitional forwarding folders from returning.

### Trade-offs

- TypeScript types disappear at runtime and cannot reject malformed HTTP JSON.
- Producer mapper tests and frontend resource tests are mandatory at wire
  boundaries.
- Runtime validation must be added by the owning runtime when a boundary truly
  requires it; it must not be hidden behind a Shared naming convention.

### Follow-up work

Shared frontend HTTP/Auth infrastructure and reusable React UI extraction are
separate decisions. This ADR does not authorize moving browser session behavior
or presentation code into `packages/shared`.
