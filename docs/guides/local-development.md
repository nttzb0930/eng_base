# Local Development

This guide owns repeatable setup, PostgreSQL, Prisma, migration, and application
startup commands. Architecture documents explain ownership; this file explains
how to run the repository safely.

## Prerequisites

- Node.js 22 LTS or a compatible LTS version supported by the installed dependencies.
- pnpm `10.30.1`, as declared by the root `packageManager` field.
- Docker Desktop for the provided PostgreSQL 15 Compose service, or a compatible PostgreSQL server.
- Git and PowerShell for the Windows command examples.

Confirm the active tools:

```powershell
node --version
pnpm --version
docker compose version
```

## Environment configuration

Install dependencies and create the untracked root environment file:

```powershell
pnpm install
Copy-Item .env.example .env
```

All three applications and API offline scripts load the root `.env`. At minimum,
local API startup requires a reachable `DATABASE_URL` plus distinct
`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values of at least 32 characters.

`NEXT_PUBLIC_*` values are compiled into browser code and are not secrets.
Provider keys and dictionary paths below the offline-vocabulary section are not
required to boot Web, Admin, or API. Do not populate or invoke provider settings
unless the corresponding data workflow is the explicit task.

## Start PostgreSQL

The Compose service is named `db` and publishes PostgreSQL on port `5432`:

```powershell
docker compose up -d db
docker compose ps
```

The repository example URL is:

```text
postgresql://postgres:123456@localhost:5432/lingo
```

These credentials are local-development defaults only. Do not reuse them in a
shared or production environment.

Stop the container without deleting its named volume:

```powershell
docker compose stop db
```

## Generate the Prisma client

Generate `@prisma/client` after installing dependencies or changing
`schema.prisma`:

```powershell
pnpm db:generate
```

Generation reads the schema and writes client code in `node_modules`; it does
not connect to PostgreSQL or change database data.

## Apply migrations

Apply migrations already committed to the repository:

```powershell
pnpm --filter @repo/api db:migrate:deploy
```

Create a new development migration only in a reviewed schema-change task:

```powershell
pnpm --filter @repo/api db:migrate -- --name <descriptive-migration-name>
```

Before committing a new migration:

1. review the Prisma schema diff;
2. read the generated SQL;
3. test it against disposable/local data;
4. verify application behavior and rollback/recovery expectations;
5. commit the schema and migration directory together.

`migrate deploy` applies committed migrations and never creates a new migration.
Use it for a fresh clone, CI, staging, and production deployment after backup and
release review.

## Start applications

Start all runtimes through Turbo:

```powershell
pnpm dev
```

Or start one runtime:

```powershell
pnpm dev:web
pnpm dev:admin
pnpm dev:api
```

Default local endpoints:

| Runtime     | URL                         |
| ----------- | --------------------------- |
| Learner Web | `http://localhost:3000`     |
| Admin       | `http://localhost:3001`     |
| API         | `http://localhost:4000/api` |
| PostgreSQL  | `localhost:5432`            |

Authenticated flows need API plus the selected frontend. API startup validates
database, JWT, CORS, rate-limit, and proxy settings before serving requests.

## Prisma Studio

Open the local database browser:

```powershell
pnpm db:studio
```

Studio can mutate data. Treat edits as database writes, and do not use Studio to
replace a repeatable migration, seed, or reviewed data workflow.

## Migration command policy

| Command             | Purpose                                      | Normal use                              |
| ------------------- | -------------------------------------------- | --------------------------------------- |
| `db:generate`       | Regenerate Prisma client                     | setup/schema change                     |
| `db:migrate`        | Create/apply a development migration         | reviewed schema task                    |
| `db:migrate:deploy` | Apply committed migrations                   | setup/deployment                        |
| `db:push`           | Force schema state without migration history | exceptional disposable prototyping only |
| `db:migrate:reset`  | Drop/recreate schema and rerun migrations    | destructive disposable environment only |
| `db:seed`           | Write canonical learning data                | explicit data task only                 |

Do not use `db:push` to repair migration history or prepare a release. Do not run
reset or seed as a compile/test prerequisite.

## Troubleshooting

### Prisma P1001: database is unreachable

1. Run `docker compose ps` and confirm service `db` is healthy.
2. Check that port `5432` is not occupied by another PostgreSQL instance.
3. Compare `.env` `DATABASE_URL` with the actual host, port, user, password, and database.
4. Start or restart the intended PostgreSQL service, then rerun the same migration command.

Do not change migration history to solve a network error.

### Prisma P3009: a previous migration failed

Prisma blocks later migrations until the failed record is resolved. Preserve a
backup, inspect `_prisma_migrations`, read the failed migration SQL, and determine
whether PostgreSQL applied none, part, or all of its statements.

- Use `prisma migrate resolve --rolled-back <migration>` only after the database
  has been restored/repaired to the state before that migration and it is safe to rerun.
- Use `prisma migrate resolve --applied <migration>` only after manual repair has
  made the database exactly match the migration's intended state.

Never mark a migration applied merely to bypass the error. Production recovery
requires a reviewed backup, repair plan, and verification of schema and data.

### API rejects environment configuration

Read the startup validation message and correct `.env`. JWT secrets must be
different; `TRUST_PROXY_HOPS` must reflect the known proxy chain; CORS origins
must list the actual frontend origins. Do not weaken validation in order to boot
a misconfigured environment.

## Data-changing commands

The following operations require an explicit task and confirmation:

- schema push/reset, seed, or manual Prisma Studio edits;
- dictionary, audio, or example enrichment;
- normalization or part-of-speech database sync;
- Topic seeding or any other data apply;
- AI-provider classification or expansion generation.

Architecture, formatting, type checking, and normal unit/architecture tests are
database-independent. Read [Vocabulary data pipeline](../data/vocabulary-pipeline.md)
before any vocabulary operation.
