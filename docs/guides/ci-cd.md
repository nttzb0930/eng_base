# CI/CD and GHCR

This guide owns English Base continuous verification and container publication.
The repository publishes images; it does not automatically deploy applications
or mutate a database.

## Workflow inventory

`.github/workflows` contains exactly two files:

| Workflow           | Triggers                                   | Permission                          | Responsibility                              |
| ------------------ | ------------------------------------------ | ----------------------------------- | ------------------------------------------- |
| `ci.yml`           | every push, pull request to `main`, manual | `contents: read`                    | generate, verify, test, lint, build, format |
| `docker-build.yml` | push to `main`, `v*.*.*` tag, manual       | `contents: read`, `packages: write` | build and publish three GHCR images         |

Do not combine publication with CI. A failing application gate should be clear
without registry noise, and image publication should not need database or
provider credentials.

## Continuous verification

CI uses Node.js 22, the repository pnpm version, a frozen lockfile, and synthetic
compile-only environment values. It runs, in order:

1. Prisma client generation;
2. all architecture checks;
3. workspace tests;
4. the standalone vocabulary workflow tests;
5. TypeScript checks;
6. lint;
7. production builds;
8. Prettier for root/canonical docs and workflows.

The PostgreSQL URL is a valid format but CI does not connect to it. CI never
runs migration, push, reset, seed, vocabulary provider, SSH, or release actions.
Do not add a service database merely to satisfy a unit or architecture test.

## GHCR authentication and permissions

The publication workflow logs in to `ghcr.io` with:

```text
username = github.actor
password = secrets.GITHUB_TOKEN
```

`GITHUB_TOKEN` is created by GitHub for the workflow. The job grants only
`contents: read` and `packages: write`; no Docker Hub account, personal access
token, or registry secret is required. Organization policy must allow Actions
to create packages and grant the workflow package write access.

## Image matrix and names

The matrix publishes:

```text
ghcr.io/<owner-lowercase>/eng-base-api
ghcr.io/<owner-lowercase>/eng-base-web
ghcr.io/<owner-lowercase>/eng-base-admin
```

The workflow lowercases `GITHUB_REPOSITORY_OWNER` before generating metadata.
Each entry points to its application Dockerfile and receives its own GitHub
Actions cache scope.

Docker metadata produces:

- a branch tag for `main` publication;
- a `sha-...` traceability tag;
- semantic version tags for a matching `vMAJOR.MINOR.PATCH` Git tag.

Prefer immutable SHA or full semantic-version tags for a controlled rollout.
A branch tag is convenient but can move after the next publication.

## Variables versus secrets

Configure these GitHub repository Variables when publishing frontends:

| Variable                | Example                       | Used by       |
| ----------------------- | ----------------------------- | ------------- |
| `NEXT_PUBLIC_APP_NAME`  | `English Base`                | Web and Admin |
| `NEXT_PUBLIC_WEB_URL`   | `https://learn.example.com`   | Web build     |
| `NEXT_PUBLIC_ADMIN_URL` | `https://admin.example.com`   | Admin build   |
| `NEXT_PUBLIC_API_URL`   | `https://api.example.com/api` | Web and Admin |

These are public browser values and become part of frontend output. Localhost
fallbacks keep manual verification possible, but production publication should
set all four Variables deliberately.

Do not store database credentials, JWT secrets, provider keys, or private URLs
as frontend Variables or build arguments. Private API values belong in the
runtime secret/configuration facility of the hosting platform. The API image
accepts no secret build argument.

## Build and publication flow

For each matrix entry the workflow:

1. checks out the exact commit;
2. initializes Buildx;
3. authenticates to GHCR;
4. resolves the lowercase image name;
5. creates branch/SHA/semver metadata;
6. builds from the monorepo root with GitHub Actions cache;
7. pushes the resulting tags.

Frontend entries pass only the three approved `NEXT_PUBLIC_*` Docker arguments.
The API entry uses a separate build step with no build arguments. Dockerfiles do
not migrate, seed, or start an application during image construction.

## Package visibility and access

New GHCR packages may be private depending on account or organization policy.
After the first successful publication, open the package settings to confirm:

- visibility is intentional;
- repository linkage is correct;
- Actions and deployment identities have only required access;
- retention policy matches release needs.

Public images can be pulled anonymously. Private images require `docker login
ghcr.io` with a token that has `read:packages` and access to the package.

## Local build, pull, and run

Build the same Dockerfiles locally:

```powershell
docker build -f apps/api/Dockerfile -t eng-base-api:local .
docker build -f apps/web/Dockerfile -t eng-base-web:local .
docker build -f apps/admin/Dockerfile -t eng-base-admin:local .
```

Pull a published immutable tag:

```powershell
docker pull ghcr.io/<owner>/eng-base-api:sha-<commit>
```

Run frontend images on their native ports:

```powershell
docker run --rm -p 3000:3000 ghcr.io/<owner>/eng-base-web:<tag>
docker run --rm -p 3001:3001 ghcr.io/<owner>/eng-base-admin:<tag>
```

Run API with private configuration injected at runtime:

```powershell
docker run --rm -p 4000:4000 --env-file .env ghcr.io/<owner>/eng-base-api:<tag>
```

The database host must be reachable from inside the container. `localhost`
inside a container refers to that container, not the host PostgreSQL process;
use a container network service name or an approved host gateway value.

## Failure diagnosis

### Frozen install fails

Run `pnpm install` with the pinned pnpm version locally, review the manifest and
lockfile diff, then commit both. Do not remove `--frozen-lockfile` from CI or
Docker to hide drift.

### Prisma generation asks for database configuration

Generation loads Prisma config but should not connect. CI and the API builder
provide a compile-only resolved URL. Do not inject production database secrets
into the build.

### Frontend points at the wrong host

Check repository Variables and rebuild the image. `NEXT_PUBLIC_*` values are
build-time public configuration; changing container runtime env does not
reliably replace values already compiled into a Next bundle.

### GHCR returns permission denied

Confirm the workflow has `packages: write`, Actions package creation is allowed,
the package is linked to the repository, and organization policy has not reduced
`GITHUB_TOKEN` access. Do not replace it with a broad personal token without a
reviewed need.

### A semantic tag is missing

The Git ref must match `v*.*.*`. Inspect metadata output and confirm the Git tag
was pushed; a local tag alone does not trigger GitHub Actions.

## Publish is not deploy

The Docker workflow ends when images are stored in GHCR. It does not select an
environment, update a service, run migrations, seed data, change package
visibility, or verify production traffic. Those actions require a separate,
reviewed deployment design with environment protection, rollback, database
backup/migration policy, and post-release health checks.
