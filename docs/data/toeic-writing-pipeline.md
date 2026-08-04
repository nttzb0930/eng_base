# TOEIC Writing licensed-content pipeline

This workflow acquires the approved TOEIC Writing Part 1 and Part 2 source into
private, checksummed packages. It accepts exactly 48 published Part 1 tasks and
50 published Part 2 tasks. Part 3 is outside the first release.

## Private credentials and storage

Keep source credentials in these ignored files; never pass them on the command
line or commit them:

```text
var/licensed-content/dautoeic/source-authorization.txt
var/licensed-content/dautoeic/source-user-access-token.txt
```

The API key belongs in `source-authorization.txt`. Put only the user access
token in `source-user-access-token.txt`; an optional `Bearer ` prefix is removed
by the adapter. Refresh the user token if the source returns `JWT expired`.

Packages are written below:

```text
var/licensed-content/dautoeic/writing/
  inventories/<inventory-sha>.json
  <source-task-id>/<source-version>/
    manifest.json
    content.json
    validation.json
    media/<sha256>.<extension>
```

Do not move this directory into a tracked path or commit its content.

## Catalog preview mapping

- Part 1 learner cards use `payload.requiredWords` and `payload.pattern`.
  Source `image_name` values are internal acquisition metadata and must never
  be rendered as learner-facing titles.
- Part 2 source `title_vi` is stored as `payload.titleVi`; the English `title`
  remains the primary learner-facing title.
- Existing imported rows can return `titleVi: null` until an operator reviews,
  approves, downloads, validates, and imports a newer Writing snapshot.
- Catalog UI and API deployments do not run acquisition commands or mutate
  Writing content automatically.

## PowerShell operator flow

Inventory reads source metadata and image headers. It does not download image
bodies and does not connect to PostgreSQL:

```powershell
pnpm --filter @repo/api data:inventory-toeic-writing -- --workers=4
```

Review the reported counts and checksum, then explicitly approve that exact
checksum for the download:

```powershell
$env:WRITING_SHA = "<inventorySha256>"
pnpm --filter @repo/api data:download-toeic-writing -- --approved-sha=$env:WRITING_SHA --workers=4
```

The download uses a bounded worker pool, writes image bodies to partial files,
verifies bytes, MIME type and SHA-256, and atomically completes each package.
Running it again resumes packages whose `validation.json` is already valid.

Validate all private packages without contacting the source:

```powershell
pnpm --filter @repo/api data:validate-toeic-writing
```

Validation covers every immutable package version retained in private storage,
so `packageCount` can exceed the current inventory size of 98 after a source
refresh. The command fails only when a retained package is invalid. Import is
still scoped to the explicitly approved inventory SHA.

Inventory, download, and validation do not load `.env` and do not require
`DATABASE_URL`. The later import command is the only Writing pipeline step that
connects to PostgreSQL.

## Failure behavior

- `401` or `403`: stop and refresh the private user token; there is no anonymous
  fallback.
- Count other than `48 + 50`: reject the inventory and inspect upstream
  publication/visibility.
- Approved SHA mismatch: stop; do not substitute a newer inventory silently.
- Invalid media or content: keep other complete packages, report bounded task
  identifiers, and exit non-zero.
