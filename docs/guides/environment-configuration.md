# Environment Configuration

This guide is the canonical owner of environment-variable policy for English
Base. It defines which runtime owns each value, how files are handled, and how
database, CI, container, and hosted configurations stay consistent.

## File policy

- `.env.example` is the committed contract and contains safe examples only.
- `.env` is the ignored local file. Copy the example, then replace credentials;
  automation must never overwrite it.
- CI variables exist only for compilation and verification. They do not grant
  access to a production database or provider.
- Hosted and container secrets are injected by the deployment platform at
  runtime. They are not Docker build arguments or image layers.
- Never commit `.env`, provider keys, JWT values, database passwords, exported
  credentials, or production URLs containing credentials.

Create the local file once:

```powershell
Copy-Item .env.example .env
```

## Ownership table

| Variables                                      | Owner                        | Visibility         | When read                      |
| ---------------------------------------------- | ---------------------------- | ------------------ | ------------------------------ |
| `NEXT_PUBLIC_APP_NAME`                         | Web/Admin                    | Browser-public     | Next build and browser runtime |
| `NEXT_PUBLIC_APP_URL`                          | Web/Admin                    | Browser-public     | Next build and browser runtime |
| `NEXT_PUBLIC_API_URL`                          | Web/Admin                    | Browser-public     | Next build and browser runtime |
| `APP_NAME`, `APP_SERVICE_NAME`                 | API application config       | Server-only        | API startup                    |
| `API_PORT`, `CORS_ORIGINS`, `TRUST_PROXY_HOPS` | API application config       | Server-only        | API startup                    |
| `JWT_*`                                        | API Auth config              | Secret             | API startup                    |
| `RATE_LIMIT_*`, `AUTH_*_LIMIT`, `AUTH_*_TTL`   | API rate-limit config        | Server-only        | API startup                    |
| `DATABASE_URL`, `DB_*`                         | Database URL resolver        | Secret             | Prisma CLI/runtime/scripts     |
| `LICENSED_CONTENT_ROOT`                        | API application config       | Server-only path   | API startup/media delivery     |
| `GEMINI_*`, `WRITING_AI_*`                     | API TOEIC Writing            | Secret/server-only | API startup/explicit scripts   |
| provider and vocabulary variables              | Offline vocabulary workflows | Secret/local path  | Explicit data command only     |

Frontend code reads only explicit `NEXT_PUBLIC_*` values. English Base has no
generic frontend environment module: each framework boundary reads the public
value it owns and supplies a safe development fallback. A public variable is
visible to every browser user and must never contain `SECRET`, `PASSWORD`,
`TOKEN`, or `DATABASE` material.

API capability code does not read `process.env`. Reads are restricted to
`src/config`, process bootstrap, and the Prisma adapter boundary; capability
behavior consumes validated or injected configuration.

Admin-editable runtime Settings are operational product values stored through
the Settings capability; they are not environment variables. That store must
never contain credentials, tokens, provider keys, database URLs, private paths,
or deployment-only configuration. Secrets and infrastructure values remain at
the validated environment boundaries described in this guide.

`LICENSED_CONTENT_ROOT` points to the private provider-owned directory that
contains canonical TOEIC media paths. Local workspace scripts default it to
`../../var/licensed-content/dautoeic` from `apps/api`. A hosted API must mount
the private media volume and set an explicit absolute root; media is never
copied into Web assets or committed to Git.

## TOEIC Writing AI

TOEIC Writing AI is fail-closed. `GEMINI_ENABLED=false` is the default and the
API refuses provider-backed work unless both the enable flag and a non-empty
`GEMINI_API_KEY` are present. Model names, timeout, daily quota, reservation
TTL, and delivery limits are server-owned values; none may use a
`NEXT_PUBLIC_*` prefix.

`WRITING_AI_DAILY_LIMIT` counts successful, non-cached grades per learner and
resets at UTC midnight. `WRITING_AI_RESERVATION_TTL_MS` releases abandoned
in-flight quota reservations. `WRITING_AI_USER_LIMIT`, `WRITING_AI_IP_LIMIT`,
and `WRITING_AI_RATE_LIMIT_TTL` protect HTTP delivery; their current store is
process-local, so a multi-replica deployment must replace it with shared
storage before relying on it as a global limit.

See `docs/runbooks/toeic-writing-ai.md` for migration, enrichment, smoke,
rollback, and observability procedures. The normal smoke command is a dry run:
provider traffic occurs only when the operator also passes `--call-provider`.

## Database URL resolution

Every Prisma consumer calls the same `resolveDatabaseUrl` function. Resolution
has one deterministic order:

1. A non-empty, fully resolved `postgresql://` or `postgres://` `DATABASE_URL`
   wins.
2. A missing URL, or a template still containing `${...}`, is rebuilt from
   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_SCHEMA`.
3. User, password, database, and schema components are URL-encoded. Ports must
   be integers from `1` through `65535`.
4. Missing components, malformed URLs, and non-PostgreSQL protocols fail before
   Prisma opens a connection.

The committed template intentionally remains readable:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=replace-with-local-password
DB_NAME=eng_base
DB_SCHEMA=public
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}
```

Tools that expand variables may resolve `DATABASE_URL` before Node starts.
Tools that do not expand it pass the template to the resolver, which builds the
same encoded URL from `DB_*`. A hosted platform may instead provide only one
fully resolved `DATABASE_URL`; it overrides the component values.

## Local configuration

Use the root `.env` for all workspace commands. Set Web defaults to port `3000`,
Admin to port `3001`, and API to port `4000`. Because both Next applications
share the root file, `NEXT_PUBLIC_APP_URL` normally identifies the Learner Web
locally; override it to `http://localhost:3001` when building Admin artifacts
that emit absolute Admin URLs.

The PostgreSQL Compose service reads `DB_USER`, `DB_PASSWORD`, and `DB_NAME`
from `.env`, publishes `${DB_PORT:-5432}`, and is addressed as service `db` in
Compose networks. Do not put container-only hostnames into the shared local URL
unless the API also runs in that network.

## Offline vocabulary providers

Vocabulary provider variables are read only by explicit data commands. They are
not required to boot Web, Admin, or API. Keep real keys in the ignored root
`.env`; committed examples must leave key values empty.

For an OpenAI-compatible local proxy whose API root is
`http://127.0.0.1:8045/v1`, use:

```dotenv
VOCAB_AI_PROVIDER=openai-compatible
VOCAB_TOPIC_MODEL=gemini-3-flash
VOCAB_TOPIC_BATCH_SIZE=50
VOCAB_TOPIC_MINIMUM_WORDS=30
VOCAB_AI_CONCURRENCY=3
VOCAB_AI_DEBUG=false
OPENAI_API_KEY=replace-in-local-env-only
OPENAI_BASE_URL=http://127.0.0.1:8045/v1
```

`OPENAI_BASE_URL` is the API root, not the complete endpoint. The Topic runner
appends `/chat/completions`; setting the complete endpoint would duplicate that
path. Use `GEMINI_API_KEY` only when `VOCAB_AI_PROVIDER=gemini`.

Basic run and per-batch progress is always printed. Set `VOCAB_AI_DEBUG=true`
only for bounded provider/model, record-count, mismatch-code, and fingerprint
prefix metadata. Debug mode still excludes keys, authorization headers, full
prompts, full batches, and raw provider responses.

Any key pasted into chat, terminal history, logs, or a Git commit must be
rotated. Removing it from the current `.env.example` does not remove it from Git
history; history rewriting is a separate destructive operation that requires a
reviewed backup and explicit approval before any remote push.

## CI configuration

CI uses synthetic compile-only values:

- a local-format PostgreSQL URL or complete `DB_*` set that is never contacted;
- two distinct JWT strings of at least 32 characters;
- localhost public URLs and CORS origins;
- neutral application identities.

Verification jobs must not migrate, reset, seed, call AI providers, or print
the environment. Repository variables are appropriate for public frontend build
values. Repository secrets are reserved for private runtime/deployment values;
GHCR publication uses the workflow `GITHUB_TOKEN` and needs no registry secret.

## Docker configuration

Only these build arguments may enter the frontend images:

```text
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_API_URL
```

They are public by definition. The API image accepts no secret build argument.
Inject `DATABASE_URL` or `DB_*`, JWT secrets, CORS, rate-limit values, and proxy
settings when the container starts. Building an image must not require or test
a database connection.

## Hosted environments

Create a separate variable set for development, staging, and production. At
minimum, production supplies:

- the three frontend public values at each frontend build;
- API identity, port, exact CORS origins, and the known proxy hop count;
- distinct high-entropy JWT access and refresh secrets;
- either one resolved PostgreSQL URL or all database components;
- runtime rate-limit values appropriate for the deployment topology.

When the API has multiple replicas, the current process-local rate-limit store
must be replaced by shared storage before scaling. Environment changes do not
alter that architectural requirement.

## Secret rotation

1. Create the replacement in the secret manager without committing it.
2. For database credentials, grant the new principal and verify connectivity
   before revoking the old one.
3. For JWT secrets, plan for existing access/refresh sessions to become invalid
   unless a deliberate dual-key transition is implemented.
4. Deploy the new runtime values, verify Health and an authenticated flow, then
   revoke the previous secret.
5. Never log the old or new value while diagnosing rollout failures.

## Safe database rename

A database name is operational state, not a source-code rename. Back up the
current database, provision or rename it during a reviewed maintenance window,
update `DB_NAME` or the resolved URL, run committed migrations against the
intended target, and verify schema plus critical flows before removing the old
target. Keep a rollback connection value until verification finishes.

Do not edit migration history, run `db:push`, or mark a failed migration applied
merely to make a renamed database start. Never automate production database
rename from application startup.

## Troubleshooting

### The URL still contains `${...}`

Ensure all six `DB_*` values are present. The resolver deliberately ignores the
unexpanded template and reports the missing component by name.

### Credentials contain `@`, `/`, spaces, or Unicode

Prefer component values and let the resolver encode them. If providing a fully
resolved URL, encode credentials before storing it.

### Prisma reports P1001

Verify the intended host from the process location: `localhost` from the host,
or the Compose service name from a container network. Check the port and service
health; do not modify migrations to solve connectivity.

### Browser calls the wrong API or origin

Rebuild the affected frontend after changing `NEXT_PUBLIC_*`; those values may
be compiled into its bundle. Confirm API CORS lists the exact Web/Admin origins.

### API rejects startup configuration

Read the named validation issue. Correct the environment instead of weakening
the schema. JWT secrets must be long and different, the database contract must
resolve, ports must be valid, and proxy hops must match known infrastructure.
