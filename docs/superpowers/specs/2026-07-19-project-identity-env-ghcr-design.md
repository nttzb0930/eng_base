# Project Identity, Environment, Docker, and GHCR Design

## Status

Approved in conversation on 2026-07-19. This specification defines the design
checkpoint before implementation.

## Context

The repository is technically named `eng_base`, while its public product name
is `English Base`. The current source still mixes that identity with historical
`Lingo` names and the learner-facing `VoCaBu` brand. Database, health, Admin,
locale transport, metadata, and documentation therefore do not describe one
system consistently.

Environment access is also split between validated API configuration, direct
`process.env` reads, duplicated localhost fallbacks, and one complete
`DATABASE_URL`. The local Docker database cannot reuse individual database
fields without duplicating connection information.

The reference Ecommerce repository demonstrates useful patterns: grouped
database variables, namespaced Nest configuration, GitHub Actions, multi-stage
Docker builds, and image publishing. It also includes Docker Hub credentials,
notifications, path filtering, SSH, and VPS deployment that English Base does
not currently need. English Base will adopt the useful boundaries without
copying that operational complexity or any Ecommerce-specific name.

## Goals

- Use `eng_base` as the technical repository/codebase identity.
- Use `English Base` as the public product identity.
- Remove historical `Lingo` and `VoCaBu` branding from active source, tests,
  configuration, Docker, and documentation.
- Define one documented root environment contract with strict ownership and
  safe defaults.
- Support component-based PostgreSQL settings locally and a single
  `DATABASE_URL` override in hosted environments.
- Ensure Prisma CLI, Nest runtime, migrations, and offline scripts resolve the
  same database URL.
- Add reproducible Docker images for API, Web, and Admin.
- Add exactly two GitHub workflows: verification and GHCR image publishing.
- Publish images directly to GitHub Container Registry with `GITHUB_TOKEN`.

## Non-goals

- Creating a GitHub repository or pushing the current local repository.
- Docker Hub accounts, repositories, access tokens, or images.
- SSH, VPS, Kubernetes, cloud-platform, or application deployment.
- Running a database migration, reset, seed, or vocabulary-provider workflow.
- Renaming the existing local PostgreSQL database automatically.
- Moving or recreating the existing `v1.0.1` tag.
- Adding Redis, background workers, notifications, or observability services.
- Turning the product into a general-purpose white-label platform.

## Canonical identity

| Concern                     | Canonical value      | Ownership                        |
| --------------------------- | -------------------- | -------------------------------- |
| Repository and root package | `eng_base`           | root workspace                   |
| Public product              | `English Base`       | frontend public environment      |
| Admin product               | `English Base Admin` | Admin derives from product name  |
| API display name            | `English Base API`   | API application config           |
| API service identifier      | `eng-base-api`       | API application config           |
| PostgreSQL database         | `eng_base`           | local infrastructure config      |
| PostgreSQL container        | `eng-base-db`        | Docker Compose                   |
| Locale transport header     | `x-app-locale`       | Web i18n infrastructure constant |
| English course code         | `english-vocabulary` | Courses capability constant      |

Application identity does not belong in `packages/shared`. The API reads its
identity from validated server environment configuration. Web and Admin read
`NEXT_PUBLIC_APP_NAME` directly at their owning Next.js boundaries and fall back
to `English Base`; they do not introduce a frontend `environment.ts` convention.

The English course is identified by the immutable `courses.code` value
`english-vocabulary`, not by its editable display title. Seed and Placement Test
import one Courses-owned code constant. Auth cookie names are protocol constants
and remain API-owned; they are not environment variables.

The English vocabulary word `clerk` remains in the canonical catalog. The
Clerk-residue architecture test also remains. Neither is a Clerk authentication
dependency.

## Root environment contract

Only `.env.example` is committed. `.env` is the ignored local file. Production
secrets are supplied by the deployment runtime; GitHub Actions uses repository
variables, environment variables, and the built-in `GITHUB_TOKEN` as described
below.

The template is grouped by owner:

```dotenv
# Application identity
APP_NAME="English Base API"
APP_SERVICE_NAME=eng-base-api
NEXT_PUBLIC_APP_NAME="English Base"

# Runtime
NODE_ENV=development
TZ=Asia/Ho_Chi_Minh
NEXT_TELEMETRY_DISABLED=1

# Local PostgreSQL components
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=replace-with-local-password
DB_NAME=eng_base
DB_SCHEMA=public

# Composed locally; replace with a complete provider URL in production
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}

# Runtime URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:4000/api
API_PORT=4000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

JWT, rate-limit, proxy, and offline vocabulary sections remain grouped below
these values. Examples contain placeholders only. No committed file contains a
working password, JWT secret, provider key, registry token, or SSH key.

### Public and private variables

- `NEXT_PUBLIC_*` values are public and may be embedded into Web/Admin bundles.
- `DATABASE_URL`, `DB_PASSWORD`, JWT secrets, and provider keys are server-only.
- A value must never be duplicated with a public prefix for convenience.
- Docker build arguments may contain only `NEXT_PUBLIC_*` values.
- API secrets are injected when an API container starts, never when it builds.

## Database URL resolution

A framework-neutral API config function owns URL construction:

```text
apps/api/src/config/database-url.ts
  resolveDatabaseUrl(environment): string
```

Resolution is deterministic:

1. A non-empty, fully resolved `DATABASE_URL` wins and must parse as a
   PostgreSQL URL.
2. A missing URL or a template URL that still contains `${...}` is constructed
   from `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and
   `DB_SCHEMA`.
3. All components are validated; user, password, database, and schema values are
   encoded safely before construction.
4. Missing or invalid configuration fails closed with an actionable error.

The root API environment schema accepts exactly one usable route: a valid URL
override or a complete set of components. `prisma.config.ts`, the Prisma
adapter, Nest runtime, seed entrypoint, and database-writing offline scripts all
reuse this resolver. No second interpolation or URL-building implementation is
allowed.

Docker Compose maps `DB_USER`, `DB_PASSWORD`, and `DB_NAME` to the official
PostgreSQL variables. The API runs on the host during the current local
workflow, so `DB_HOST=localhost` remains the default. A future containerized API
may override only `DB_HOST=db`.

The existing ignored `.env` continues to target `lingo` until the developer
explicitly creates `eng_base` and chooses whether to migrate local data. Source
changes must not silently break or mutate that database.

## Application configuration ownership

### API

- Zod validates runtime configuration at startup.
- `ConfigModule` loads application, JWT, database, and rate-limit config.
- Capabilities consume injected configuration instead of reading `process.env`.
- Direct environment reads are limited to bootstrap/configuration boundaries,
  Prisma CLI support, and offline script entrypoints.
- Health reports `APP_SERVICE_NAME`; logging uses the application identity.
- CORS, port, proxy trust, cookie security, and authentication consume validated
  configuration rather than repeating localhost or production checks.

### Web and Admin

Frontend configuration follows the reference codebase's direct ownership style.
Metadata and branded UI read `NEXT_PUBLIC_APP_NAME` with the `English Base`
fallback. HTTP adapters read `NEXT_PUBLIC_API_URL`; absolute-URL helpers read
`NEXT_PUBLIC_APP_URL`. No generic `environment.ts`, config folder, or frontend
environment abstraction is introduced. Required public URL values are supplied
and checked by build/test configuration.

The product name is used by metadata, Web marketing/auth content, Admin title,
navigation, and accessible labels. Translated messages that mention the product
use an `{appName}` parameter or a value supplied by the owning frontend
boundary; they do not embed `VoCaBu`.

## Course identity

`courses` gains an immutable unique `code`. The initial English course uses
`english-vocabulary`. A migration backfills that code for the existing English
course and deterministic `course-<id>` values for any other existing records
before applying `UNIQUE` and `NOT NULL` constraints.

Course creation requires a kebab-case code. Course updates do not accept code,
and Admin shows it as read-only after creation. Titles and images remain
editable. Database relations continue using numeric course IDs. Placement Test
looks up the English course by code.

No `slug` or learner Course Detail route is added. Slug remains a future URL
concern for a route such as `/[locale]/courses/[slug]`; business behavior must
continue using immutable code even if editable slugs are introduced later.

The API URL has one owner per frontend runtime. There are no duplicate
`http://localhost:4000/api` fallbacks in HTTP adapters.

## Docker design

The repository adds:

```text
.dockerignore
apps/api/Dockerfile
apps/web/Dockerfile
apps/admin/Dockerfile
```

All Dockerfiles use multi-stage builds, pnpm's locked dependency graph, and the
monorepo root as build context.

- API image generates Prisma, builds Nest, and runs only the compiled runtime
  plus required production dependencies and Prisma artifacts.
- Web and Admin images use Next standalone output and run as non-root users.
- Images contain no `.env`, Git metadata, vocabulary working/backups, local
  database data, test output, or provider credentials.
- Web/Admin Dockerfiles accept only the explicit public build arguments required
  by their environment modules.
- API performs no migration or seed during image build or container startup.

## GitHub Actions design

Exactly these workflow files are added:

```text
.github/workflows/ci.yml
.github/workflows/docker-build.yml
```

No notification action, Docker Hub integration, SSH deployment, or separate CD
workflow is included.

### `ci.yml`

Triggers:

- every branch push;
- pull requests targeting `main`;
- manual `workflow_dispatch`.

The workflow grants read-only repository contents permission, uses Node 22 and
the repository-declared pnpm version, caches pnpm dependencies, and installs
with `--frozen-lockfile`. It then runs, in fail-fast order:

1. Prisma client generation;
2. `pnpm architecture:check`;
3. `pnpm test`;
4. the standalone 20-test vocabulary workflow command;
5. `pnpm check-types`;
6. `pnpm lint`;
7. `pnpm build`;
8. Prettier/check-diff verification required by the canonical guide.

CI supplies only safe placeholder values required for compilation. It does not
start PostgreSQL or call migration, seed, sync, enrichment, or an AI provider.

### `docker-build.yml`

Triggers:

- pushes to `main`;
- tags matching `v*`;
- manual `workflow_dispatch`.

The workflow has `contents: read` and `packages: write`. It logs in to
`ghcr.io` with `${{ github.actor }}` and `${{ secrets.GITHUB_TOKEN }}`. No
registry account or custom registry token is required.

A matrix builds API, Web, and Admin using their own Dockerfiles. The owner is
normalized to lowercase before composing image names:

```text
ghcr.io/<owner>/eng-base-api
ghcr.io/<owner>/eng-base-web
ghcr.io/<owner>/eng-base-admin
```

Docker metadata publishes applicable tags for branch, commit SHA, and semantic
release tag. A `v1.2.3` release produces `v1.2.3`, `1.2`, `1`, and SHA tags;
`main` produces `main` and SHA tags. Buildx uses the GitHub Actions cache.

The workflow builds and publishes artifacts only. Deploying those artifacts is
a separate future decision.

## Root README and operating guides

The root `README.md` remains Vietnamese and becomes the practical entrypoint for
humans evaluating or starting the repository. It must not duplicate complete
architecture rules, environment reference material, or CI implementation
details. It summarizes them and links to their canonical owners.

The README contains these sections in order:

1. project identity and purpose;
2. applications and technology stack, including local ports;
3. architecture principles;
4. current monorepo structure, including Docker and GitHub workflows;
5. prerequisites with exact supported Node and pnpm versions;
6. step-by-step local setup from `.env.example` through migrations and startup;
7. local access URLs;
8. environment model and public/private variable distinction;
9. command reference with purpose and data-safety classification;
10. Docker images and GHCR usage;
11. the two CI/image workflows and their triggers;
12. Git/release guidance without claiming unenforced hooks;
13. canonical documentation links and database/vocabulary safety warnings.

The README must not mention Make, Docker Hub, Redis, BullMQ, MinIO, Telegram,
VPS deployment, benchmarks, staging environments, or commit-hook enforcement
that this repository does not provide.

Two English canonical guides own the detailed operating rules:

```text
docs/guides/environment-configuration.md
docs/guides/ci-cd.md
```

`environment-configuration.md` defines:

- the committed/ignored env file policy;
- every environment group and its runtime owner;
- local `DB_*` resolution versus hosted `DATABASE_URL` override;
- how API, Prisma CLI, offline scripts, Web, and Admin consume configuration;
- build-time public values versus runtime secrets;
- local, CI, Docker, and future production examples using placeholders only;
- validation, failure behavior, secret rotation, and troubleshooting;
- the safe procedure for moving local data from `lingo` to `eng_base` without
  silently mutating the existing database.

`ci-cd.md` defines:

- the responsibility and trigger of `ci.yml` and `docker-build.yml`;
- required GitHub permissions and why `GITHUB_TOKEN` is sufficient for GHCR;
- image naming and tag policy;
- repository variables versus secrets;
- public Next.js build arguments and private API runtime values;
- package visibility and the first-push GHCR behavior;
- local Docker build/pull/run examples;
- failure diagnosis, cache behavior, and release verification;
- the explicit boundary that image publication is not application deployment.

`docs/README.md`, `AGENTS.md`, and the root README link to these guides without
copying their normative content. Existing local-development and verification
guides link to the new owner when an environment or workflow detail would
otherwise be repeated.

## Security and failure behavior

- Required runtime secrets fail validation; production never falls back to
  example JWT secrets or database passwords.
- Workflow logs do not print complete environment files or secret values.
- Docker build args are assumed public and are reviewed accordingly.
- `GITHUB_TOKEN` is scoped to package publication by workflow permissions.
- CI fails if naming residue, forbidden Clerk dependencies, private env exposure,
  duplicated database URL construction, missing Dockerfiles, or unexpected
  workflow files return.
- A failed image build prevents publication for that matrix entry and reports
  the failing runtime directly.

## Testing and architecture enforcement

Implementation adds or updates tests for:

- database URL override, component construction, encoding, and invalid input;
- API environment identity and required-secret validation;
- frontend public-variable ownership and required build values;
- consistent product/service/header/database naming;
- absence of active `Lingo` and `VoCaBu` residue;
- continued absence of Clerk dependencies and env keys;
- immutable Course code migration, creation, mapping, and Placement Test lookup;
- exactly two workflow files and required GHCR permissions/triggers;
- Dockerfile presence and secret-free build-argument policy.

The existing full repository and vocabulary gates remain mandatory. Docker image
builds are verified by `docker-build.yml`; implementation should also build each
image locally when Docker is available, but lack of a local Docker daemon does
not justify weakening the workflow or static architecture checks.

## Rollout order

1. Add characterization tests for identity, environment, workflow, and Docker
   invariants.
2. Introduce canonical identity without a frontend environment abstraction.
3. Replace `Lingo`/`VoCaBu` usage and centralize protocol constants.
4. Add immutable Course code across migration, API, Shared types, seed, Admin,
   and Placement Test.
5. Add database URL resolution and migrate all database consumers.
6. Update `.env.example`, Compose, local-development docs, verification docs,
   architecture guidance, the root README, and the two canonical operating
   guides.
7. Add `.dockerignore` and the three multi-stage Dockerfiles.
8. Add `ci.yml` and `docker-build.yml`.
9. Run narrow tests, the full verification gate, and Docker builds when
   available.
10. Commit implementation without moving `v1.0.1`; release tagging is a separate
    user decision after review.

## Acceptance criteria

- Active tracked source/config/docs contain no historical `Lingo` or `VoCaBu`
  branding.
- Root package identity is `eng_base`; public UI consistently says
  `English Base`.
- `.env.example` is complete, safe, grouped, and matches validated usage.
- The Vietnamese root README provides complete onboarding without claiming
  tooling or deployment features the repository does not contain.
- English environment and CI/CD guides are linked from the canonical docs index
  and own detailed configuration/workflow instructions.
- All database consumers use one tested resolver.
- Course selection and Placement Test do not depend on an editable course title.
- Existing local database state is not mutated.
- Three production Dockerfiles build from the monorepo root without secrets.
- `.github/workflows` contains exactly `ci.yml` and `docker-build.yml`.
- CI runs every canonical verification gate without database/provider writes.
- Docker images publish only to GHCR using the built-in GitHub token.
- No Docker Hub, deploy, notification, registry-creation, or SSH setup is
  required.
