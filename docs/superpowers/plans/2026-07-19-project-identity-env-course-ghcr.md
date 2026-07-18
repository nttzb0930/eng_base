# Project Identity, Course Code, Environment, Docker, and GHCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `eng_base` a reusable, consistently named English-learning base with immutable Course identity, one database environment contract, production containers, and GHCR-only automation.

**Architecture:** Runtime environment boundaries own application identity; the Courses capability owns immutable Course codes; numeric IDs remain relational keys. All Prisma consumers share one URL resolver. Next.js applications read only explicit public variables, while API secrets remain runtime-only. CI verification and GHCR publication are separate workflows.

**Tech Stack:** Node.js 22, pnpm 10.30.1, Turborepo, TypeScript 6, Next.js 16, NestJS 11, Zod 4, Prisma 7, PostgreSQL 15, Docker Buildx, GitHub Actions, GHCR.

## Global Constraints

- Root package identity is `eng_base`; public fallback name is `English Base`; API service identity is `eng-base-api`.
- Frontend code must not add `environment.ts`, an environment config folder, or application-name constants to `@repo/shared`.
- `courses.code` is immutable and unique; `title` and `imageSrc` remain editable; no `slug` or Course Detail route is added.
- Active source/config/tests/canonical docs contain no historical whole-word `Lingo` or `VoCaBu` branding.
- `.env.example` is committed; ignored `.env` is never overwritten automatically.
- A resolved PostgreSQL `DATABASE_URL` overrides `DB_*`; a missing or `${...}` template URL is rebuilt from validated components.
- Do not run migrate, reset, seed, vocabulary providers, synchronization, or database rename.
- Docker build arguments contain only `NEXT_PUBLIC_*`; server secrets are injected only at runtime.
- `.github/workflows` contains exactly `ci.yml` and `docker-build.yml`; images publish only to GHCR through `GITHUB_TOKEN`.
- Root README is Vietnamese; canonical guides remain English; `v1.0.1` is not moved or recreated.
- Execute sequentially, use red-green-refactor for behavior changes, and commit every green checkpoint.

---

### Task 1: Correct frontend identity ownership

**Files:**

- Delete: `packages/shared/src/constants/application.ts`
- Delete: `packages/shared/test/application-constants.test.ts`
- Delete: `apps/web/app/environment.ts`
- Delete: `apps/web/test/environment.test.ts`
- Delete: `apps/admin/app/environment.ts`
- Delete: `apps/admin/test/environment.test.ts`
- Create: `apps/web/test/project-identity.architecture.test.ts`
- Modify: `packages/shared/src/constants/index.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/admin/package.json`
- Modify: Web/Admin layouts, branded UI, Auth views, marketing view, HTTP clients, URL helpers, and messages already present in the dirty checkout

**Interfaces:**

- Produces direct ownership of `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_API_URL` at frontend consumers.
- Removes `DEFAULT_APP_NAME` and `DEFAULT_API_SERVICE_NAME` from Shared.

- [ ] Write `project-identity.architecture.test.ts` asserting root name `eng_base`, absence of both environment modules, absence of Shared application constants, and no whole-word legacy brand in active frontend roots.
- [ ] Run `pnpm --filter @repo/web exec tsx --test test/project-identity.architecture.test.ts`; expect failure on rejected files/constants.
- [ ] Delete rejected files and restore direct reads:

```ts
const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";
const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
```

- [ ] Restore normal frontend test scripts; retain neutral translated copy and the `docs/superpowers` exclusion in the Clerk residue guard.
- [ ] Run Web/Admin tests, architecture, types, and Shared tests; expect all PASS.
- [ ] Commit `refactor: align frontend identity with runtime ownership`.

---

### Task 2: Add immutable Course code

**Files:**

- Create: `apps/api/prisma/migrations/20260719120000_add_course_code/migration.sql`
- Create: `apps/api/src/module/courses/course.constants.ts`
- Create: `apps/api/src/module/courses/tests/course-code.test.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/scripts/seed.ts`
- Modify: `apps/api/src/module/placement-test/use-cases/confirm-placement-level.use-case.ts`
- Modify: `apps/api/src/module/courses/dto/course-content-management.dto.ts`
- Modify: `apps/api/src/module/courses/mappers/course-content.mapper.ts`
- Modify: Course mapper/use-case/controller tests
- Modify: `packages/shared/src/constants/course.ts`
- Modify: `packages/shared/src/types/course.ts`
- Modify: Shared, Web Course, and Admin Course fixtures/tests
- Modify: `apps/admin/app/features/courses/components/CoursesManagementScreen.tsx`

**Interfaces:**

- Produces API-owned `ENGLISH_VOCABULARY_COURSE_CODE = "english-vocabulary"` and `COURSE_CODE_PATTERN`.
- Produces `Course.code` and create-only `CreateCoursePayload.code`; `UpdateCoursePayload` excludes code.

- [ ] Add failing Shared/mapper tests requiring `code`, plus a Placement Test behavior test asserting `findFirst({ where: { code: ENGLISH_VOCABULARY_COURSE_CODE } })`.
- [ ] Run focused Shared/API tests; expect missing property/constant/mapping failures.
- [ ] Add `code String @unique` to Prisma and write this safe migration sequence:

```sql
ALTER TABLE "courses" ADD COLUMN "code" TEXT;
UPDATE "courses" SET "code" = 'course-' || "id"::text;
WITH "english_course" AS (
  SELECT "id" FROM "courses"
  WHERE "title" = 'English Vocabulary'
  ORDER BY "id" LIMIT 1
)
UPDATE "courses" SET "code" = 'english-vocabulary'
WHERE "id" = (SELECT "id" FROM "english_course");
ALTER TABLE "courses" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");
```

- [ ] Implement constants, DTO kebab-case validation, read/create mapper support, seed code, and Placement Test code lookup; remove `DEFAULT_ENGLISH_COURSE_TITLE` from Shared.
- [ ] Define payloads exactly:

```ts
export type CreateCoursePayload = Pick<Course, "code" | "title" | "imageSrc">;
export type UpdateCoursePayload = Partial<Pick<Course, "title" | "imageSrc">>;
```

- [ ] Add Admin create-only code input, a read-only code display while editing, a code table column, and exclude code from update requests.
- [ ] Run `db:generate`, Shared/API/Admin/Web tests and type gates; do not run migration or seed.
- [ ] Commit `feat: add immutable course codes`.

---

### Task 3: Centralize API application configuration

**Files:**

- Create: `apps/api/src/config/application.config.ts`
- Create: `apps/api/src/common/http/auth-cookie.constants.ts`
- Modify: `apps/api/src/config/env.validation.ts`
- Modify: `apps/api/src/config/index.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/module/health/health.controller.ts`
- Modify: `apps/api/src/module/health/health.controller.spec.ts`
- Modify: `apps/api/src/module/auth/auth.controller.ts`
- Modify: Auth delivery/rate-limit tests

**Interfaces:**

- Produces `application` config with `name`, `serviceName`, `port`, `corsOrigins`, `trustProxyHops`, and `isProduction`.
- Produces `AUTH_COOKIE_NAMES` with `refresh`, `refreshMarker`, and `access`.

- [ ] Write failing env/Health tests for `APP_NAME="English Base API"`, `APP_SERVICE_NAME="eng-base-api"`, and injected Health service name.
- [ ] Implement `registerAs("application", ...)` using direct env reads only inside the config boundary; do not import Shared identity constants.
- [ ] Load config through `ConfigModule`; migrate bootstrap, Health, Auth cookies, production cookie policy, and rate-limit cookie tracking.
- [ ] Run env, Health, Auth, rate-limit, API type, lint, and architecture gates.
- [ ] Commit `refactor: centralize API application configuration`.

---

### Task 4: Build one database URL resolver

**Files:**

- Create: `apps/api/src/config/database-url.ts`
- Create: `apps/api/src/config/database-url.test.ts`
- Modify: API env schema/tests/index
- Modify: `apps/api/prisma.config.ts`
- Modify: `apps/api/src/database/prisma/prisma.config.ts`
- Modify: `apps/api/scripts/seed.ts`
- Modify: direct Prisma vocabulary database/audio/example entrypoints
- Modify: `.env.example`
- Modify: `docker-compose.yml`

**Interfaces:**

- Produces `resolveDatabaseUrl(environment: DatabaseEnvironment): string` for Prisma CLI, runtime, seed, and offline scripts.

- [ ] Write failing tests for resolved override priority, unresolved `${...}` fallback, absent URL fallback, encoded credentials, missing components, invalid port, and non-PostgreSQL protocol.
- [ ] Implement a framework-neutral resolver. A URL containing `${` is unresolved and must not win. Component construction URL-encodes user/password/database/schema and accepts ports `1..65535`.
- [ ] Make API Zod validation accept either a valid resolved URL or all six `DB_*` components, using the resolver for the final check.
- [ ] Route every Prisma consumer through the resolver and prove with `rg` that no second URL builder remains.
- [ ] Update `.env.example` with:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=replace-with-local-password
DB_NAME=eng_base
DB_SCHEMA=public
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}
```

- [ ] Update Compose to `eng-base-db`, `env_file: .env`, `${DB_*}` PostgreSQL mapping, a dynamic host port, and container-safe healthcheck; do not start Compose.
- [ ] Run resolver/env tests, `db:generate`, API types and architecture; commit `refactor: centralize database environment resolution`.

---

### Task 5: Finish frontend branding and locale protocol

**Files:**

- Create: `apps/web/app/i18n/request-header.ts`
- Modify: `apps/web/proxy.ts`
- Modify: `apps/web/app/i18n/request.ts`
- Modify: `apps/web/test/no-clerk-residue.test.ts`
- Modify: `apps/web/test/project-identity.architecture.test.ts`
- Modify: remaining Web/Admin branded labels and metadata reported by the architecture test

**Interfaces:**

- Produces `LOCALE_REQUEST_HEADER = "x-app-locale"` used by both proxy and next-intl request setup.

- [ ] Extend the identity test to require the locale constant and reject whole-word legacy brands in frontend source while allowing `vocabulary`.
- [ ] Run architecture tests and record exact offenders.
- [ ] Replace the old locale header with the constant, remove the `lingo` metadata keyword, and replace only reported branding residue.
- [ ] Run Web/Admin tests, architecture, types and lint; commit `refactor: complete frontend identity migration`.

---

### Task 6: Enforce environment ownership and document it

**Files:**

- Create: `apps/api/test/environment-ownership.architecture.test.ts`
- Create: `docs/guides/environment-configuration.md`
- Modify: `apps/api/package.json`
- Modify: `docs/README.md`
- Modify: `docs/guides/local-development.md`
- Modify: `docs/architecture/api.md`
- Modify: `docs/architecture/frontend.md`
- Modify: `AGENTS.md`

- [ ] Write a failing architecture test allowing API runtime reads only in configuration/bootstrap/Prisma boundaries and frontend reads only for explicit `NEXT_PUBLIC_*` consumers. Reject public keys containing `SECRET`, `PASSWORD`, `TOKEN`, or `DATABASE`.
- [ ] Fix only reported ownership offenders and add the test to `architecture:check`.
- [ ] Write the English guide covering file policy, owner table, public/private boundary, template resolver flow, local/CI/Docker/hosted examples, secret rotation, safe database rename, and troubleshooting.
- [ ] Link the guide from canonical docs and AGENTS without duplicating normative content.
- [ ] Run API architecture, Markdown Prettier and diff checks; commit `docs: define environment configuration ownership`.

---

### Task 7: Add the API production container

**Files:**

- Create: `.dockerignore`
- Create: `apps/api/Dockerfile`
- Create: `apps/api/test/docker-architecture.test.ts`
- Modify: `apps/api/package.json`

- [ ] Write a failing static test requiring Node 22, Corepack, frozen install, Prisma generation, API build, non-root runner, port 4000, and `node dist/main.js`; reject build secrets and migration/seed startup.
- [ ] Add `.dockerignore` excluding Git, env files, dependencies, build/cache/log/editor output, and local vocabulary working artifacts while retaining canonical vocabulary inputs.
- [ ] Add a multi-stage monorepo-root Dockerfile that builds Shared/API and copies only required runtime artifacts into a non-root image.
- [ ] Run static test, API build/types, and local image build only if `docker version` confirms a daemon.
- [ ] Commit `build: add API production container`.

---

### Task 8: Add Web and Admin standalone containers

**Files:**

- Create: `apps/web/Dockerfile`
- Create: `apps/admin/Dockerfile`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/admin/next.config.ts`
- Modify: `apps/api/test/docker-architecture.test.ts`

- [ ] Extend the failing Docker test for Next standalone output, monorepo tracing root, Node 22, frozen install, non-root runners, ports 3000/3001, and only three approved public build args.
- [ ] Configure both Next apps with `output: "standalone"` and repository-root `outputFileTracingRoot` while retaining next-intl and Shared/UI transpilation.
- [ ] Add multi-stage Dockerfiles that accept `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_API_URL`, then copy standalone/static/public output and run as non-root.
- [ ] Run Web/Admin builds and static Docker tests; build images locally only when a daemon exists.
- [ ] Commit `build: add standalone frontend containers`.

---

### Task 9: Add canonical CI

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `apps/api/test/github-workflows.architecture.test.ts`
- Modify: `apps/api/package.json`

- [ ] Write a failing workflow test requiring push/all branches, pull request/main, manual dispatch, read-only contents, Node 22, pnpm frozen install, Prisma generation, architecture, tests, standalone 20-test vocabulary gate, types, lint, build, and Prettier.
- [ ] Add one Ubuntu job with safe compile-only English Base env values and two distinct 32+ character JWT secrets; forbid migration, seed, providers, Docker Hub, SSH, deployment and secret output.
- [ ] Run workflow and API architecture tests; commit `ci: add canonical verification workflow`.

---

### Task 10: Publish three images to GHCR

**Files:**

- Create: `.github/workflows/docker-build.yml`
- Modify: `apps/api/test/github-workflows.architecture.test.ts`

- [ ] Extend the failing test to require exactly two workflows, main/tag/manual triggers, `packages: write`, GHCR login with actor and `GITHUB_TOKEN`, Buildx, metadata, cache, and a three-entry matrix.
- [ ] Add matrix entries exactly for `eng-base-api`, `eng-base-web`, and `eng-base-admin` using their application Dockerfiles.
- [ ] Publish lowercase-owner image names with branch, SHA, and semantic-version tags. Pass only public repository variables as frontend build args; API gets no build secrets.
- [ ] Run workflow/API architecture tests and list `.github/workflows`; commit `ci: publish application images to GHCR`.

---

### Task 11: Complete onboarding and operations documentation

**Files:**

- Rewrite: `README.md`
- Create: `docs/guides/ci-cd.md`
- Modify: `docs/README.md`
- Modify: `docs/guides/local-development.md`
- Modify: `docs/guides/verification.md`
- Modify: `AGENTS.md`
- Modify: architecture/ADR text that still presents rejected frontend environment modules or title-based Course identity

- [ ] Rewrite the root README in Vietnamese with purpose, stack/ports, architecture, structure, prerequisites, env/DB setup, URLs, commands, safety, Docker images, workflows, Git/tag guidance, and canonical links.
- [ ] Write the English CI/CD guide covering triggers, permissions, `GITHUB_TOKEN`, image/tag rules, Variables versus Secrets, public build args, private runtime values, GHCR visibility, local pull/run, failure diagnosis, and publish-not-deploy boundary.
- [ ] State explicitly that Course uses immutable code, no slug/detail route exists yet, and frontend has no generic environment module.
- [ ] Update canonical links without deleting committed `docs/superpowers` history.
- [ ] Run Markdown link/residue/Prettier/diff checks; commit `docs: complete project onboarding and operations guides`.

---

### Task 12: Full verification and handoff

**Files:** verify only; modify only the direct owner of a discovered failure.

- [ ] Check status, recent commits, stash, ignored `.env`/vocabulary artifacts, and unchanged `v1.0.1`.
- [ ] Run sequentially:

```powershell
pnpm architecture:check
pnpm test
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
pnpm check-types
pnpm lint
pnpm build
pnpm exec prettier --check README.md AGENTS.md CONTEXT.md "docs/**/*.md" ".github/workflows/*.yml"
git diff --check
```

- [ ] If Docker daemon exists, rebuild all three images; otherwise record the exact `docker version` failure and rely on static contracts plus application builds.
- [ ] Confirm exactly two workflows, no active legacy brands/Docker Hub/Clerk provider residue, one database resolver, immutable Course code, and no local data/tag mutation.
- [ ] Commit only direct verification fixes as `fix: close project operations verification gaps`; do not create an empty commit.
- [ ] Report final commit, clean status, gate counts, Docker evidence, unchanged tag, no remote push, and that GHCR begins only after GitHub push with Actions enabled.
