# Project Identity, Environment, Docker, and GHCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `eng_base` the technical codebase identity, make `English Base` the only public identity, centralize environment/database configuration, and publish reproducible API/Web/Admin images to GHCR through exactly two GitHub workflows.

**Architecture:** Framework-neutral defaults live in Shared; each runtime owns one validated configuration adapter. API database consumers share one URL resolver, Next runtimes expose no server secrets, and Docker receives only public frontend build arguments. GitHub Actions separates verification from image publication and uses the built-in GitHub token.

**Tech Stack:** Node.js 22, pnpm 10.30.1, Turborepo, TypeScript 6, Next.js 16 standalone output, NestJS 11, Zod 4, Prisma 7, PostgreSQL 15, Docker Buildx, GitHub Actions, GHCR.

## Global Constraints

- Root package identity is `eng_base`; workspace packages remain `@repo/*`.
- Public identity is `English Base`; Admin derives `English Base Admin`; API service identity is `eng-base-api`.
- Active source/config/tests/canonical docs contain no historical `Lingo` or `VoCaBu` branding. The vocabulary word `clerk` and Clerk-residue guard remain valid.
- `.env.example` is committed; ignored `.env` is never overwritten automatically.
- Local PostgreSQL uses validated `DB_*`; non-empty `DATABASE_URL` is the hosted override.
- Do not run migration, reset, seed, vocabulary provider, sync, or database rename.
- Docker build args contain only `NEXT_PUBLIC_*`; API/JWT/database/provider secrets are runtime-only.
- `.github/workflows` contains exactly `ci.yml` and `docker-build.yml`.
- Publish only to `ghcr.io` with `${{ secrets.GITHUB_TOKEN }}`; no Docker Hub, SSH, VPS deploy, Telegram, or notifications.
- Root README is Vietnamese; all other canonical docs remain English.
- Do not move or recreate `v1.0.1`.
- Execute sequentially and commit after each green task.

## Locked file map

**New source/tests:**

```text
packages/shared/src/constants/application.ts
packages/shared/test/application-constants.test.ts
apps/web/app/environment.ts
apps/web/app/i18n/request-header.ts
apps/web/test/environment.test.ts
apps/web/test/project-identity.architecture.test.ts
apps/admin/app/environment.ts
apps/admin/test/environment.test.ts
apps/api/src/config/application.config.ts
apps/api/src/config/database-url.ts
apps/api/src/config/database-url.test.ts
apps/api/src/common/http/auth-cookie.constants.ts
apps/api/test/environment-ownership.architecture.test.ts
apps/api/test/docker-architecture.test.ts
apps/api/test/github-workflows.architecture.test.ts
```

**New operations/docs:**

```text
.dockerignore
apps/api/Dockerfile
apps/web/Dockerfile
apps/admin/Dockerfile
.github/workflows/ci.yml
.github/workflows/docker-build.yml
docs/guides/environment-configuration.md
docs/guides/ci-cd.md
```

---

### Task 1: Canonical identity and Course constants

**Files:**

- Create: `packages/shared/src/constants/application.ts`
- Create: `packages/shared/test/application-constants.test.ts`
- Modify: `packages/shared/src/constants/index.ts`
- Modify: `packages/shared/src/constants/course.ts`
- Modify: `apps/api/scripts/seed.ts`
- Modify: `apps/api/src/module/placement-test/use-cases/confirm-placement-level.use-case.ts`
- Modify: `package.json`

**Interfaces:**

- Produces: `DEFAULT_APP_NAME`, `DEFAULT_API_SERVICE_NAME`, `DEFAULT_ENGLISH_COURSE_TITLE` from root `@repo/shared`.
- Consumers: Tasks 2 and 3.

- [ ] **Step 1: Write failing Shared tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_API_SERVICE_NAME,
  DEFAULT_APP_NAME,
  DEFAULT_ENGLISH_COURSE_TITLE,
} from "../src/index.js";

test("canonical application identity", () => {
  assert.equal(DEFAULT_APP_NAME, "English Base");
  assert.equal(DEFAULT_API_SERVICE_NAME, "eng-base-api");
});

test("canonical default Course identity", () => {
  assert.equal(DEFAULT_ENGLISH_COURSE_TITLE, "English Vocabulary");
});
```

- [ ] **Step 2: Prove red**

Run: `pnpm --filter @repo/shared test`

Expected: FAIL because exports do not exist.

- [ ] **Step 3: Implement constants and consumers**

```ts
// application.ts
export const DEFAULT_APP_NAME = "English Base";
export const DEFAULT_API_SERVICE_NAME = "eng-base-api";
```

Add `DEFAULT_ENGLISH_COURSE_TITLE = "English Vocabulary"` to `course.ts`, export
`application.js`, rename the root package to `eng_base`, and replace the seed
and Placement Test title literals with the Shared constant.

- [ ] **Step 4: Prove green**

Run:

```powershell
pnpm --filter @repo/shared test
pnpm --filter @repo/api check-types
```

Expected: PASS; the literal Course title has one declaration.

- [ ] **Step 5: Commit**

```powershell
git add package.json packages/shared apps/api/scripts/seed.ts apps/api/src/module/placement-test
git commit -m "refactor: establish canonical project identity"
```

---

### Task 2: Frontend public environment and branding

**Files:**

- Create: `apps/web/app/environment.ts`
- Create: `apps/web/app/i18n/request-header.ts`
- Create: `apps/web/test/environment.test.ts`
- Create: `apps/admin/app/environment.ts`
- Create: `apps/admin/test/environment.test.ts`
- Create: `apps/web/test/project-identity.architecture.test.ts`
- Modify: `apps/web/test/no-clerk-residue.test.ts`
- Modify: Web/Admin layouts, Auth/marketing views, Admin layout components, HTTP clients, URL utilities, Web messages, `proxy.ts`, and `app/i18n/request.ts`

**Interfaces:**

- Produces in each runtime: `parsePublicEnvironment(input)` and `publicEnvironment` with `{ appName, appUrl, apiUrl }`.
- Produces in Web: `LOCALE_REQUEST_HEADER = "x-app-locale"`.

- [ ] **Step 1: Keep historical plans outside active residue scans**

Update the recursive scanner in `no-clerk-residue.test.ts` to skip only
`docs/superpowers` in addition to existing build/dependency directories. Run
`pnpm --filter @repo/web architecture:check`; expected PASS.

- [ ] **Step 2: Write failing environment tests in both runtimes**

```ts
test("public environment trims values and URL suffixes", () => {
  assert.deepEqual(
    parsePublicEnvironment({
      NEXT_PUBLIC_APP_NAME: " English Base ",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000/",
      NEXT_PUBLIC_API_URL: "http://localhost:4000/api/",
    }),
    {
      appName: "English Base",
      appUrl: "http://localhost:3000",
      apiUrl: "http://localhost:4000/api",
    }
  );
});

test("public environment rejects missing or invalid URLs", () => {
  assert.throws(
    () => parsePublicEnvironment({ NEXT_PUBLIC_API_URL: "not-a-url" }),
    /NEXT_PUBLIC_APP_URL|NEXT_PUBLIC_API_URL/
  );
});
```

- [ ] **Step 3: Prove red**

Run both `tsx --test test/environment.test.ts` commands; expect missing-module failures.

- [ ] **Step 4: Implement both runtime-owned parsers**

```ts
import { DEFAULT_APP_NAME } from "@repo/shared";

function requiredUrl(name: string, value?: string) {
  if (!value?.trim()) throw new Error(`${name} is required`);
  const url = new URL(value.trim());
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name} must use http or https`);
  }
  return url.toString().replace(/\/$/u, "");
}

export function parsePublicEnvironment(
  input: Record<string, string | undefined>
) {
  return {
    appName: input.NEXT_PUBLIC_APP_NAME?.trim() || DEFAULT_APP_NAME,
    appUrl: requiredUrl("NEXT_PUBLIC_APP_URL", input.NEXT_PUBLIC_APP_URL),
    apiUrl: requiredUrl("NEXT_PUBLIC_API_URL", input.NEXT_PUBLIC_API_URL),
  };
}
```

Instantiate with explicit `process.env.NEXT_PUBLIC_*` reads in each environment
module; no dynamic env indexing.

- [ ] **Step 5: Migrate all consumers**

HTTP clients use `apiUrl`; URL helpers use `appUrl`; layouts/views/components use
`appName`; Admin appends ` Admin`; Web metadata removes the `lingo` keyword.
Define one locale-header constant used by Proxy/request setup. Replace branded
message text with neutral learning copy where an app-name parameter is not
available.

- [ ] **Step 6: Add identity architecture enforcement**

Scan the two frontend runtime roots and root package metadata. Report relative
offender paths and assert no case-insensitive `lingo`/`vocabu`, root package
name `eng_base`, and locale header `x-app-locale`. API, infrastructure, and
canonical-doc residue are enforced by their owning later tasks and the final
cross-repository audit, so this checkpoint can remain independently green.

- [ ] **Step 7: Prove green and commit**

Run Web/Admin test, architecture, and type gates. Commit:

```powershell
git add apps/web apps/admin
git commit -m "refactor: centralize frontend identity configuration"
```

---

### Task 3: API application configuration and protocol constants

**Files:**

- Create: `apps/api/src/config/application.config.ts`
- Create: `apps/api/src/common/http/auth-cookie.constants.ts`
- Modify: API config index/schema/tests, `app.module.ts`, `main.ts`, Health, Auth controller, and Auth rate-limit tracker

**Interfaces:**

- Produces `application` namespace: `name`, `serviceName`, `port`, `corsOrigins`, `trustProxyHops`, `isProduction`.
- Produces `AUTH_COOKIE_NAMES`: `refresh`, `refreshMarker`, `access`.

- [ ] **Step 1: Write failing env/health tests**

Assert default `APP_NAME=English Base`, `APP_SERVICE_NAME=eng-base-api`, and
Health obtains `application.serviceName` from a ConfigService stub.

- [ ] **Step 2: Prove red**

Run env and health test files; expect missing defaults/injection failure.

- [ ] **Step 3: Implement application config**

```ts
export default registerAs("application", () => ({
  name: process.env.APP_NAME?.trim() || DEFAULT_APP_NAME,
  serviceName: process.env.APP_SERVICE_NAME?.trim() || DEFAULT_API_SERVICE_NAME,
  port: Number(process.env.API_PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 0),
  isProduction: process.env.NODE_ENV === "production",
}));
```

Load it through ConfigModule; bootstrap and Health use ConfigService.

- [ ] **Step 4: Centralize cookie names and secure policy**

```ts
export const AUTH_COOKIE_NAMES = {
  refresh: "client_refresh_token",
  refreshMarker: "client_has_rt",
  access: "user_token",
} as const;
```

Use this in Auth and rate limiting. Auth obtains production mode from injected
application config; business modules and `main.ts` stop reading `process.env`.

- [ ] **Step 5: Prove green and commit**

Run env, health, Auth controller, rate-limit tests, API types and lint. Commit:

```powershell
git add apps/api/src
git commit -m "refactor: centralize API application configuration"
```

---

### Task 4: One database URL resolver and component-based local database

**Files:**

- Create: `apps/api/src/config/database-url.ts`
- Create: `apps/api/src/config/database-url.test.ts`
- Modify: env schema/tests/index, both Prisma configs, seed/direct Prisma scripts, `.env.example`, `docker-compose.yml`

**Interfaces:**

- Produces `resolveDatabaseUrl(environment: DatabaseEnvironment): string` for every Prisma consumer.

- [ ] **Step 1: Write failing resolver tests**

Test URL override priority, encoded component construction, missing components,
invalid port, and rejection of non-PostgreSQL URLs. Expected encoded example:

```text
postgresql://postgres:p%40ss%20word@localhost:5432/eng_base?schema=public
```

- [ ] **Step 2: Prove red**

Run the resolver test; expect missing module.

- [ ] **Step 3: Implement pure resolver**

Use no Nest/Prisma/dotenv imports. Trim values; accept only `postgres:` or
`postgresql:`; require port `1..65535`; encode user/password/database/schema;
fail with the missing key name.

- [ ] **Step 4: Validate either configuration route**

Make `DATABASE_URL` and six `DB_*` fields optional in Zod, then `superRefine`
through the resolver. Preserve JWT distinction and rate-limit validation.

- [ ] **Step 5: Route all consumers through it**

Use the resolver from Prisma CLI config, runtime adapter, seed, export, audio,
and example scripts. `rg` must show no second database URL construction.

- [ ] **Step 6: Update env template and Compose**

Use the approved `DB_*` block, empty `DATABASE_URL`, `eng-base-db`, Compose
`env_file: .env`, `${DB_*}` mapping, dynamic port, and `$$POSTGRES_*` healthcheck.
Do not edit ignored `.env` or start Compose.

- [ ] **Step 7: Prove green and commit**

Run resolver/env tests, `db:generate`, API type and architecture gates. Commit:

```powershell
git add .env.example docker-compose.yml apps/api
git commit -m "refactor: centralize database environment resolution"
```

---

### Task 5: Environment ownership guard and guide

**Files:**

- Create: `apps/api/test/environment-ownership.architecture.test.ts`
- Create: `docs/guides/environment-configuration.md`
- Modify: API architecture script, docs index/local development/API/frontend architecture, and `AGENTS.md`

- [ ] **Step 1: Write ownership test**

Allow direct runtime reads only in API config/Prisma config and the two frontend
environment modules. Allow provider reads only in offline script entrypoints.
Reject direct env reads in modules/components/views/hooks/HTTP adapters and any
public key containing `SECRET`, `PASSWORD`, `TOKEN`, or `DATABASE`.

- [ ] **Step 2: Run and fix exact offenders**

Run the test, fix only paths it reports, add it to API `architecture:check`, and
rerun until green.

- [ ] **Step 3: Write canonical environment guide**

Cover file policy, owner table, public/private boundary, resolver flow, runtime
consumption, local/CI/Docker/hosted examples, failure behavior, secret rotation,
safe `lingo` to `eng_base` migration, and troubleshooting. Use placeholders and
state that changing Compose does not rename existing data.

- [ ] **Step 4: Link without duplication**

Update docs index, AGENTS, architecture, and local development to link the new
owner instead of repeating rules.

- [ ] **Step 5: Verify and commit**

Run API architecture, Markdown Prettier and diff check. Commit:

```powershell
git add AGENTS.md docs apps/api/test apps/api/package.json
git commit -m "docs: define environment configuration ownership"
```

---

### Task 6: Docker contract and API image

**Files:**

- Create: `.dockerignore`
- Create: `apps/api/Dockerfile`
- Create: `apps/api/test/docker-architecture.test.ts`
- Modify: API architecture script

- [ ] **Step 1: Write failing API Docker contract test**

Assert Node 22 Alpine, Corepack, frozen install, Prisma generation, Nest build,
non-root runner, port 4000, and `node dist/main.js`. Reject ARG names containing
JWT/database/password/secret/token/provider terms and reject migration/seed in
RUN/ENTRYPOINT/CMD.

- [ ] **Step 2: Prove red**

Run the named API image subtest; expect missing files.

- [ ] **Step 3: Add `.dockerignore` and multi-stage API Dockerfile**

Exclude Git/env/dependencies/build/cache/log/editor/local vocabulary artifacts.
Keep canonical catalog/taxonomy. Build from monorepo root, generate Prisma/build
Shared/API, copy required pnpm runtime links/artifacts, create non-root user, and
run only compiled API.

- [ ] **Step 4: Verify and commit**

Run static test, API build/types, then `docker version` and local API build when
daemon exists. Record exact daemon failure otherwise. Commit:

```powershell
git add .dockerignore apps/api/Dockerfile apps/api/test apps/api/package.json
git commit -m "build: add API production container"
```

---

### Task 7: Web/Admin standalone images

**Files:**

- Create: `apps/web/Dockerfile`
- Create: `apps/admin/Dockerfile`
- Modify: both Next configs and Docker architecture test

- [ ] **Step 1: Extend failing tests**

Require `output: "standalone"`, monorepo tracing root, Node 22, frozen install,
non-root runner, correct ports, standalone/static/public copies, and only
`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL` build args.

- [ ] **Step 2: Prove red**

Run full Docker architecture test; expect missing files/config.

- [ ] **Step 3: Configure standalone output**

Both configs set standalone output and `outputFileTracingRoot` to repository
root. Keep Web next-intl wrapper and transpile both Shared/UI.

- [ ] **Step 4: Add multi-stage Dockerfiles**

Declare only approved public args, expose them through ENV for Next build, create
an empty root `.env` for existing dotenv wrapper, copy standalone/static/public,
run generated server as non-root on ports 3000/3001.

- [ ] **Step 5: Verify and commit**

Run Web/Admin builds, Docker test, and both local Docker builds when daemon is
available. Commit:

```powershell
git add apps/web/Dockerfile apps/admin/Dockerfile apps/web/next.config.ts apps/admin/next.config.ts apps/api/test/docker-architecture.test.ts
git commit -m "build: add standalone frontend containers"
```

---

### Task 8: Canonical CI workflow

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `apps/api/test/github-workflows.architecture.test.ts`
- Modify: API architecture script

- [ ] **Step 1: Write failing CI workflow test**

Require push/all branches, PR/main, manual trigger, read-only contents, Node 22,
pnpm/frozen install, Prisma generation, architecture, tests, standalone 20-test
vocabulary command, types, lint, build, Prettier. Reject migration/seed/provider,
Docker Hub, SSH, deploy and secret printing.

- [ ] **Step 2: Prove red**

Run CI-named subtest; expect missing workflow.

- [ ] **Step 3: Add `ci.yml`**

Use one Ubuntu job and safe compile-only env: English Base identities, localhost
public URLs, unused CI DB components, and two distinct 32+ character JWT values.
Create empty root `.env`, install frozen, and run exact gates in fail-fast order.

- [ ] **Step 4: Verify and commit**

Run workflow test and API architecture gate. Commit:

```powershell
git add .github/workflows/ci.yml apps/api/test/github-workflows.architecture.test.ts apps/api/package.json
git commit -m "ci: add canonical verification workflow"
```

---

### Task 9: GHCR matrix workflow

**Files:**

- Create: `.github/workflows/docker-build.yml`
- Modify: workflow architecture test

- [ ] **Step 1: Extend failing GHCR test**

Require exactly two workflow files, main/tag/manual triggers, `packages: write`,
`ghcr.io`, actor/GITHUB_TOKEN login, Buildx, metadata, GHA cache, and API/Web/Admin
matrix. Reject Docker Hub credentials, SSH/deploy/notification jobs.

- [ ] **Step 2: Prove red**

Run GHCR-named subtest; expect missing workflow.

- [ ] **Step 3: Add matrix workflow**

Matrix entries are exactly:

```yaml
- { app: api, image: eng-base-api, dockerfile: apps/api/Dockerfile }
- { app: web, image: eng-base-web, dockerfile: apps/web/Dockerfile }
- { app: admin, image: eng-base-admin, dockerfile: apps/admin/Dockerfile }
```

Lowercase repository owner, publish to `ghcr.io/<owner>/<image>`, use branch/SHA/
semver major-minor-major tags, and pass only public GitHub variables to frontend
builds. API receives no build secrets.

- [ ] **Step 4: Verify and commit**

Run workflow and API architecture tests; list workflow directory to prove only
two files. Commit:

```powershell
git add .github/workflows/docker-build.yml apps/api/test/github-workflows.architecture.test.ts
git commit -m "ci: publish application images to GHCR"
```

---

### Task 10: README, CI/CD guide, canonical links, history cleanup

**Files:**

- Rewrite: `README.md`
- Create: `docs/guides/ci-cd.md`
- Modify: docs index, verification/local development, AGENTS
- Delete after incorporation: this spec and plan

- [ ] **Step 1: Rewrite Vietnamese README**

Use approved 13-section order. Include tech/ports, architecture summary,
structure, prerequisites, DB_* quick start, URLs, env summary, command/safety
table, three GHCR images, two workflow rows, Git/tag guidance, docs/safety links.
Do not claim unimplemented Ecommerce tooling.

- [ ] **Step 2: Write English CI/CD guide**

Cover triggers, permissions, built-in token, image/tag rules, Variables versus
Secrets, public build args/private runtime values, package visibility/first push,
local build/pull/run, cache/failure diagnosis, release verification, and the
publish-not-deploy boundary.

- [ ] **Step 3: Update canonical links**

Link both operating guides from docs index, AGENTS, verification and local
development without duplicating normative content.

- [ ] **Step 4: Remove implementation history**

Delete this plan and spec only after accepted rules are present in canonical
docs. Git history remains the archive.

- [ ] **Step 5: Verify and commit**

Run Markdown link audit, old-brand/Docker-Hub search excluding canonical data and
history, Prettier and diff check. Commit:

```powershell
git add README.md AGENTS.md docs
git commit -m "docs: complete project onboarding and operations guides"
```

---

### Task 11: Full verification and handoff

**Files:** verify only; modify only the direct owner of a discovered failure.

- [ ] **Step 1: Audit state**

Check status, recent diff, stash, ignored `.env`/vocabulary artifacts, and
`v1.0.1`. Confirm no local data/tag mutation.

- [ ] **Step 2: Run full sequential gates**

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

Expected: every command exits `0`; standalone vocabulary remains 20/20.

- [ ] **Step 3: Verify Docker evidence**

If daemon exists, rebuild all runner images. Otherwise report exact
`docker version` failure and rely on static contracts/application builds without
claiming local image success.

- [ ] **Step 4: Verify final invariants**

List workflows (exactly two); search active files for Lingo/VoCaBu/Docker Hub and
Clerk dependency/env keys; confirm no result except the valid vocabulary word
outside the scanned scope.

- [ ] **Step 5: Commit only direct verification fixes**

Do not create an empty commit. If a fix is necessary, stage only its owner and
commit `fix: close project operations verification gaps`.

- [ ] **Step 6: Report boundary**

Report final commit, clean status, gate counts, Docker evidence, unchanged tag,
absence of push, and that GHCR starts only after pushing to GitHub with Actions
enabled.
