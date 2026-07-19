# Vocabulary Data Pipeline

This document owns vocabulary source, provenance, workflow, review, and
database-write safety. A successful source validation does not mean a database
environment is synchronized with the repository.

## Canonical sources

Only these files define repository vocabulary data:

```text
data/vocabulary/
  vocabulary-catalog.json       canonical vocabulary catalog
  topics.json                   canonical taxonomy: exactly 103 topics
  prompts/                      versioned AI behavior contracts
  reviews/                      versioned human decisions and overrides
  working/                      generated local artifacts; ignored
  backups/                      generated local safety copies; ignored
```

`dictionaryLookupCompleted` records whether dictionary lookup ran. It does not
claim that audio or examples exist. Topic arrays in the catalog are the only
source used to create vocabulary-topic relations.

The catalog currently contains 3,000 records. The taxonomy contains exactly 103
Topics. Record identity is `normalizedWord + pos + cefrLevel`; duplicate
identities are rejected before merge or seed.

Each canonical Topic has stable `slug` and `order` fields plus manually authored
English/Vietnamese presentation fields:

```text
title, description, group
titleVi, descriptionVi, groupVi
```

`vocabulary-catalog.json[*].topics` remains an array of canonical slug strings.
Never embed localized Topic objects into catalog records. Seed synchronization
copies the taxonomy presentation fields into PostgreSQL. The Topic API accepts
`locale=en|vi`, defaults to English, and returns one localized
`title`/`description`/`group` shape with field-level English fallback. Web cache
keys include locale and group the learn-by-topic catalog by the returned group.

## Version-control policy

| Path                      | Meaning                                                              | Commit?           |
| ------------------------- | -------------------------------------------------------------------- | ----------------- |
| `vocabulary-catalog.json` | canonical vocabulary source                                          | yes               |
| `topics.json`             | canonical Topic taxonomy                                             | yes               |
| `prompts/`                | versioned provider behavior contracts                                | yes               |
| `reviews/`                | deliberate human decisions/overrides                                 | yes, when present |
| `working/`                | batches, output, rejected data, reports, previews, snapshots, audits | no                |
| `backups/`                | local safety copies created before a write                           | no                |

Do not move raw provider output into `reviews/`. A review file represents a
human decision consumed by a merge/override flow; machine output stays under
`working/` even when a person has inspected it.

## Script ownership

Vocabulary scripts are grouped by goal:

```text
apps/api/scripts/vocabulary/
  catalog/                      build and validate the canonical catalog
  database/                     snapshots, audits, and canonical seed adapters
  dictionary-enrichment/        dictionary, audio, and example enrichment
  normalization/                meaning/example normalization workflow
  pos-correction/               part-of-speech correction workflow
  topic-classification/         classify existing catalog records
  topic-expansion/              propose new records for deficient topics
```

Pure validators and their tests stay inside the flow that owns them. Do not add
a generic `scripts/lib` folder or put a vocabulary script directly under
`apps/api/scripts`.

## Catalog build and validation

Build the canonical candidate from the configured CEFR word list and Vietnamese
dictionary inputs:

```powershell
pnpm --filter @repo/api data:build-vocab
```

The catalog builder writes `data/vocabulary/vocabulary-catalog.json` and an
ignored report below `working/catalog/`. Treat this as a canonical-source write:
review record counts, identity duplicates, CEFR/POS values, examples, provenance,
and the full Git diff before commit.

Catalog validation rejects malformed records, duplicate identity, duplicate
taxonomy slugs, and unknown Topic slugs. Unclassified records are valid but are
reported explicitly; validation must never invent a Topic through keyword
matching.

## Dictionary enrichment

Dictionary workflows are owned by `dictionary-enrichment/`:

```powershell
pnpm --filter @repo/api data:enrich-json -- --limit <count|all>
pnpm --filter @repo/api data:enrich-audio -- --limit <count|all>
pnpm --filter @repo/api data:enrich-examples -- --limit <count|all>
pnpm --filter @repo/api data:export-vocab
```

These commands may call external services and may update source/database fields
depending on the command. Run a small explicit limit first, preserve provenance,
review missing/404/429 behavior, and inspect the produced report/diff. A
dictionary lookup sets `dictionaryLookupCompleted`; it does not guarantee that
audio or an example was found.

Dictionary enrichment is not the AI Topic expansion flow. It enriches known
records and must not silently create a new catalog identity or Topic relation.

## Normalization

Normalization starts from an exported database snapshot and produces reviewable
proposals without writing PostgreSQL:

```powershell
pnpm --filter @repo/api data:export-vocab-snapshot
pnpm --filter @repo/api data:export-vocab-risk
pnpm --filter @repo/api data:prepare-vocab-normalization
pnpm --filter @repo/api data:normalize-vocab-gemini
pnpm --filter @repo/api data:merge-vocab-normalization
```

Preparation records the snapshot hash and deterministic batch membership.
Provider output is validated against the source record; invalid batches remain
under `working/normalization/rejected/`. A person can create a deliberate
`reviews/normalization/batch-NNN.json` decision and apply it with:

```powershell
pnpm --filter @repo/api data:apply-vocab-normalization-override -- batch-NNN
```

Merge produces proposals and review reports with `databaseUpdated: false`. The
database sync supports `plan`, `preview`, `dry-run`, and `apply` modes:

```powershell
pnpm --filter @repo/api data:sync-vocab-normalization -- plan
pnpm --filter @repo/api data:sync-vocab-normalization -- preview
pnpm --filter @repo/api data:sync-vocab-normalization -- dry-run
```

Apply is blocked unless all review-required records are resolved, the live DB
still matches the source snapshot, the dry-run matches the proposal hash, and
the operator supplies the exact confirmation printed by the plan. Apply creates
an ignored backup and post-apply audit. Never skip directly to apply.

## Part-of-speech correction

POS correction uses the database snapshot plus risk audit to select candidates:

```powershell
pnpm --filter @repo/api data:prepare-vocab-pos-correction
pnpm --filter @repo/api data:correct-vocab-pos-gemini
pnpm --filter @repo/api data:merge-vocab-pos-correction
pnpm --filter @repo/api data:sync-vocab-pos-correction -- plan
pnpm --filter @repo/api data:sync-vocab-pos-correction -- dry-run
```

The proposal must retain immutable identity/source fields expected by the
validator. Database apply requires the exact confirmation reported by the plan,
checks live drift, writes a local backup, updates dependent challenge meaning or
answer fields in one reviewed flow, and writes a post-apply audit. Do not reuse a
normalization confirmation for POS correction.

## Classification flow

```powershell
pnpm --filter @repo/api data:prepare-topics
pnpm --filter @repo/api data:classify-topics-ai
pnpm --filter @repo/api data:merge-topics -- --check
pnpm --filter @repo/api data:merge-topics
```

Prepare creates deterministic one-based IDs and a version-2 manifest. The
manifest fingerprints the catalog, bilingual taxonomy, prompt, and every batch
input. Run prepare again after any of those canonical inputs changes.

Every output stores an execution identity containing the input/catalog/
taxonomy/prompt fingerprints plus provider and model. An existing output is
reused only when the complete identity and its records validate exactly. A
legacy or stale output is reported as `batch-stale` and regenerated; file
existence alone never causes a skip.

Basic `run-start`, per-batch, and `run-finished` JSON events are always printed.
Set `VOCAB_AI_DEBUG=true` for bounded mismatch reasons and fingerprint prefixes;
keys, prompts, batches, and raw responses are never logged. Concurrency remains
bounded by `VOCAB_AI_CONCURRENCY`.

Run one deterministic batch when resuming or diagnosing:

```powershell
pnpm --filter @repo/api data:classify-topics-ai -- batch-001
```

Provider responses must return exactly one result for every requested ID, zero
or one canonical topic, and no extra IDs. Invalid responses write sanitized
metadata under `working/topic-classification/rejected/`. A requested rejected or
missing batch makes the command exit nonzero.

`data:merge-topics -- --check` and the real merge both reject missing,
rejected, mixed-provider/model, legacy, or stale artifacts before writing. A
successful real merge creates an ignored backup and atomically replaces only
the catalog. Classification and merge never update PostgreSQL.

Audit the merged catalog before Topic expansion:

```powershell
pnpm --filter @repo/api data:audit-unclassified-topics
```

The audit is deterministic and local. It separates unclassified function words,
content recovery candidates, and manual or normalization review records below
the ignored `working/topic-classification/audit/` directory. It does not call a
provider, mutate the canonical catalog, or write PostgreSQL. Audit output does
not authorize recovery classification or Topic expansion.

## Topic expansion flow

Running the command without a topic only reports deficits and does not call a
provider:

```powershell
pnpm --filter @repo/api data:generate-topic-expansion
```

The no-slug command prints a bilingual grouped table and atomically writes the
full deterministic report to ignored
`working/topic-expansion/deficits.json`. Automation can request compact JSON:

```powershell
pnpm --filter @repo/api data:generate-topic-expansion -- --json
```

Generate one review artifact for a selected deficient topic:

```powershell
pnpm --filter @repo/api data:generate-topic-expansion -- airport
```

Passing a Topic slug prints bounded generation progress in human mode. Add
`--json` to receive JSONL start/completion events. Neither completion mode
writes PostgreSQL; the generated artifact remains in `review`.

Topic expansion is chunked. `VOCAB_TOPIC_EXPANSION_CHUNK_SIZE` defaults to `30`,
so a Topic missing 300 words creates a 30-word review artifact per run. Review
and merge that artifact, then run the same Topic again to create the next chunk.
This keeps the provider response small enough to validate reliably while
preserving the exact 10-example requirement per generated word.

For faster review batching, request multiple small chunks in one command:

```powershell
pnpm --filter @repo/api data:generate-topic-expansion -- artificial-intelligence --chunks 10 --chunk-size 5
```

Batch mode writes queue artifacts under the ignored Topic folder:

```text
working/topic-expansion/artificial-intelligence/chunk-001.json
working/topic-expansion/artificial-intelligence/chunk-002.json
```

Each provider request excludes canonical catalog words, existing pending queue
artifacts, and words generated earlier in the same command. This gives the AI
request memory without relying on provider session state. Review the chunk files,
change only good chunks to `status: "accepted"`, then merge all accepted chunks:

```powershell
pnpm --filter @repo/api data:merge-topic-expansion -- artificial-intelligence --all-accepted
```

For many deficient topics, use the queue runner. It parallelizes across topics
only; chunks inside one topic remain sequential so the next request can exclude
words produced by earlier chunks for the same topic:

```powershell
pnpm --filter @repo/api data:generate-topic-expansion-queue -- --workers 3 --chunk-size 5 --chunks-per-topic 10
```

This example runs up to three topics at the same time and creates at most 10
chunks per topic, 5 words per chunk, per queue run. Re-run the queue after
review and merge. Do not raise worker count aggressively; provider rate limits
and JSON quality usually fail before local CPU becomes the bottleneck.

For larger scale expansion, prefer the candidate-first flow. It asks the
provider for word identities only, deduplicates them against the catalog and
pending candidate artifacts, and writes a review artifact without failing the
whole run on duplicates:

```powershell
pnpm --filter @repo/api data:generate-topic-candidates -- friends --count 50 --chunk-size 50
```

Candidate artifacts are ignored working files:

```text
working/topic-candidates/friends/chunk-001.json
```

The artifact contains `candidates` for review and `rejected` entries with stable
reasons such as `catalog-duplicate` and `artifact-duplicate`. Candidate
generation does not write the canonical catalog or PostgreSQL. Accepted
candidates are the input for a later enrichment step that creates full
vocabulary records with meanings and exactly 10 bilingual examples.

Before human review, run the candidate reviewer to filter weak topic matches:

```powershell
pnpm --filter @repo/api data:review-topic-candidates -- friends --chunk chunk-002.json
```

or review every chunk for the topic:

```powershell
pnpm --filter @repo/api data:review-topic-candidates -- friends --all
```

The reviewer keeps both `core` and `supporting` candidates. It writes a `tier`
field on kept candidates so learning flows can prioritize core words first and
supporting words later. Only `reject` decisions move into `rejected` with
reasons such as `review:romantic-relationship`. This step updates only ignored
candidate artifacts; it does not write the catalog or PostgreSQL.

For all topics, keep generation and review as two separate queues:

```powershell
pnpm --filter @repo/api data:generate-topic-candidates-queue -- --workers 3 --count 20
```

Then review every topic folder that has generated candidate chunks:

```powershell
pnpm --filter @repo/api data:review-topic-candidates-queue -- --workers 3
```

Use this order for large runs: generate all topic candidates, review all topic
candidates, spot-check several artifacts manually, then enrich accepted
candidates in a later step.

Set `VOCAB_AI_DEBUG=true` while diagnosing a provider run. Debug mode prints
bounded events for `run-start`, `provider-request-start`,
`provider-response-received`, `validation-start`, `validation-success`,
`validation-failed`, and `artifact-written`, each with `durationMs` where
available. Debug output never logs provider keys, prompts, raw responses,
cookies, or database credentials.

Every generated word must have exactly 10 bilingual example pairs. AI output
uses a versioned JSON contract and provider JSON Schema. The artifact starts in
`review`; a person must inspect it and set `status` to `accepted` before:

```powershell
pnpm --filter @repo/api data:merge-topic-expansion -- airport
```

Generated words retain `source: ai-topic-expansion`, start with
`dictionaryLookupCompleted: false`, and cannot duplicate a catalog
`normalizedWord + pos + cefrLevel` identity.

## Human review

Human review is a data decision, not a folder for all generated results. Review
the original source, provider proposal, validation errors, meanings, POS/CEFR,
Topic, provenance, and all examples. Topic expansion requires exactly 10
distinct bilingual example pairs, and its primary example fields must match the
first pair.

An accepted review authorizes only the corresponding source merge. It does not
authorize database seed/sync, dictionary enrichment, or another provider call.
Commit a review file only when it remains a meaningful input or audit decision
for future maintainers.

## Database snapshots and risk audits

Read-only export commands create ignored working artifacts:

```powershell
pnpm --filter @repo/api data:export-vocab-snapshot
pnpm --filter @repo/api data:export-vocab-risk
```

A snapshot captures the baseline expected by normalization/POS validation. A
risk audit selects suspicious records; it is not canonical vocabulary source.
Both become stale when the database changes. Never commit them or reuse them
against a different environment.

## Seed and confirmed database writes

Both `db:seed` and `data:seed-topics` load and validate
`vocabulary-catalog.json` and `topics.json`. Seed scripts must not declare a
second taxonomy or infer relations from keyword matching.

Classification and expansion never update PostgreSQL. Commands that can write
the database remain explicit (`db:seed`, enrichment commands, or a confirmed
normalization/POS apply). Review dry-run output before an apply. Never run a
database-writing command merely to validate source files.

`data:seed-topics` synchronizes canonical Topic records and catalog relations; it
also synchronizes English/Vietnamese Topic presentation fields and is not a
classifier. `db:seed` may write broad learning content and progress
dependencies. Confirm the target environment, backup policy, expected record
counts, and relationship behavior before either command.

## Failure, rollback, and recovery

- Provider/validation failure: retain rejected output under `working/`, fix the
  prompt/input or human decision, and rerun only the failed deterministic batch.
- Catalog merge failure: the canonical file must remain unchanged; investigate
  the validation error before retrying.
- Database drift: stop the apply, export a new snapshot, and restart the proposal
  flow. Do not force an old proposal onto changed data.
- Partial/failed DB apply: preserve backup and audit artifacts, inspect the
  transaction/migration state, and use a reviewed repair plan. Do not mark an
  operation successful by editing its audit JSON.
- Incorrect canonical merge: restore the local backup or revert the source
  commit, rerun validation, and only then plan a separate database correction if
  the incorrect source was already applied.

## Verification

Run the API source-layout tests plus the pure workflow suite:

```powershell
pnpm --filter @repo/api test
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
```

These commands do not call providers or write PostgreSQL. Also run formatting,
type, lint, and build gates required by the owning change. Generated `working/`
and `backups/` files must remain ignored and absent from the commit.
