# Licensed TOEIC Reading Practice Operations

This operator workflow acquires only the Reading subset of the 10 newest
public/free tests in source set 2026. It does not connect to PostgreSQL, load
`.env`, download Listening Parts 1–4, or download audio/media.

## Private authorization

Store the public Supabase anonymous key as one line in:

```text
var/licensed-content/dautoeic/source-authorization.txt
```

The path is ignored by Git. Do not use or store a user Bearer token.

## 1. Inventory

From the repository root in Windows CMD:

```cmd
pnpm --filter @repo/api data:inventory-toeic-reading-practice
```

Expected pilot counts are:

```text
selectedTestCount: 10
Part 5: 300
Part 6: 160
Part 7: 540
totalQuestions: 1000
```

Copy `inventorySha256` from the bounded JSON output. Inventory stores metadata
under:

```text
var/licensed-content/dautoeic/inventories/toeic-reading-practice/
```

If any selected test does not expose `30/16/54`, inventory fails before
question bodies are downloaded.

## 2. Download JSON

Replace `INVENTORY_SHA` below with the exact 64-character value printed by the
inventory command:

```cmd
pnpm --filter @repo/api data:download-toeic-reading-practice -- --approved-sha=INVENTORY_SHA
```

Completed packages are stored at:

```text
var/licensed-content/dautoeic/toeic-reading-practice/<sourceTestId>/<sourceVersion>/
```

Each package contains `content.json`, optional `practice-stats.json`,
`validation.json`, and `manifest.json`. Presence of `manifest.json` marks a
complete package. Re-running the same approved inventory resumes completed
packages instead of rewriting them.

Reading image references remain `PENDING`; this pilot intentionally downloads
JSON only.

## 3. Validate offline

```cmd
pnpm --filter @repo/api data:validate-toeic-reading-practice
```

Validation reads local packages only. A valid pilot reports 10 valid packages;
each contains exactly 100 questions numbered 101 through 200.

## Inspect one package

```powershell
$file = Get-ChildItem var\licensed-content\dautoeic\toeic-reading-practice -Recurse -Filter content.json | Select-Object -First 1
$json = Get-Content -Raw -LiteralPath $file.FullName | ConvertFrom-Json
$json.parts | Select-Object part, @{Name="Questions";Expression={$_.questions.Count}}
```

Do not commit files under `var/licensed-content`.

## 4. Apply schema and import published content

This is the only phase that connects to PostgreSQL. Confirm the target database
and ensure a Course with the immutable code `toeic-600` already exists.
The importer fails before package writes when that Course is missing; it never
creates or seeds the Course.

Apply pending migrations:

```cmd
pnpm --filter @repo/api db:migrate:deploy
```

Then import every complete local package:

```cmd
pnpm --filter @repo/api data:import-toeic-reading-practice
```

The summary contains:

- `created`: a new source test was inserted and published;
- `updated`: a changed version replaced the owned content in one
  transaction and was published immediately;
- `skipped`: the same source test and source version already exist;
- `rejected`: validation, checksum, or package identity failed before a
  database transaction;
- `failed`: that test's transaction failed and rolled back.

Idempotency uses `(source, sourceTestId)`. Re-running unchanged packages
does not create duplicates. A new `sourceVersion` replaces the owned
content atomically while leaving the test in `PUBLISHED` state.

The command does not migrate, seed, fetch from the source, or accept source
authorization. Learner API and UI are delivered separately.

## Inventory authenticated vocabulary cache

This optional, read-only workflow inventories vocabulary that the source has
already cached for the same 10 local tests across Parts 1â€“7. It does not call
the source AI function, create missing vocabulary, connect to PostgreSQL, or
change source data.

Keep the authenticated user access token as one line in the ignored file:

```text
var/licensed-content/dautoeic/source-user-access-token.txt
```

The file may contain either the raw JWT or `Bearer <JWT>`. Never pass this token
on the command line, print it, commit it, or reuse an expired browser token.
The public anonymous key remains in `source-authorization.txt` and is sent only
as the Supabase `apikey` header.

Run from the repository root:

```powershell
pnpm --filter @repo/api data:inventory-toeic-vocabulary-cache
```

The command automatically uses the newest local TOEIC Reading inventory, 4
workers, and batches of 50 question IDs. Pin or tune a run when required:

```powershell
pnpm --filter @repo/api data:inventory-toeic-vocabulary-cache -- --reading-inventory-sha=<SHA256> --workers=4 --batch-size=50
```

Interrupted runs resume from a private checkpoint. Completed content-addressed
inventories are stored below:

```text
var/licensed-content/dautoeic/inventories/toeic-vocabulary-cache/
```

`readyCount` is the number of questions with existing cache;
`vocabularyItemCount` counts their vocabulary items; `missingCount` remains
untouched and is never sent to an AI generation endpoint.

After reviewing the exact inventory checksum, apply the schema migration and
import only that approved inventory into English Base:

```powershell
pnpm --filter @repo/api db:migrate:deploy
pnpm --filter @repo/api data:import-toeic-vocabulary-cache -- --approved-sha=<SHA256>
```

The importer validates every rich vocabulary item, resolves it through the 10
selected source tests and `sourceQuestionId`, then atomically replaces the
question-owned JSON caches. Re-running the same checksum returns `SKIPPED`.
It does not publish TOEIC tests, alter answer keys, or generate missing cache.
