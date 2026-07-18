# Vocabulary data pipeline

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

## Classification flow

```powershell
pnpm --filter @repo/api data:prepare-topics
pnpm --filter @repo/api data:classify-topics-ai
pnpm --filter @repo/api data:merge-topics -- --check
pnpm --filter @repo/api data:merge-topics
```

Prepare creates deterministic one-based IDs and a catalog SHA-256 manifest.
Provider responses must return exactly one result for every requested ID, zero
or one canonical topic, and no extra IDs. Invalid responses go to `rejected`;
the runner never silently drops unknown topics. Merge writes an ignored backup
and atomically replaces only the catalog after full validation.

## Topic expansion flow

Running the command without a topic only reports deficits and does not call a
provider:

```powershell
pnpm --filter @repo/api data:generate-topic-expansion
```

Generate one review artifact for a selected deficient topic:

```powershell
pnpm --filter @repo/api data:generate-topic-expansion -- airport
```

Every generated word must have exactly 10 bilingual example pairs. AI output
uses a versioned JSON contract and provider JSON Schema. The artifact starts in
`review`; a person must inspect it and set `status` to `accepted` before:

```powershell
pnpm --filter @repo/api data:merge-topic-expansion -- airport
```

Generated words retain `source: ai-topic-expansion`, start with
`dictionaryLookupCompleted: false`, and cannot duplicate a catalog
`normalizedWord + pos + cefrLevel` identity.

## Seed and database safety

Both `db:seed` and `data:seed-topics` load and validate
`vocabulary-catalog.json` and `topics.json`. Seed scripts must not declare a
second taxonomy or infer relations from keyword matching.

Classification and expansion never update PostgreSQL. Commands that can write
the database remain explicit (`db:seed`, enrichment commands, or a confirmed
normalization/POS apply). Review dry-run output before an apply. Never run a
database-writing command merely to validate source files.

## Version-control policy

Commit canonical JSON, prompts, human review files, scripts, tests, and docs.
Do not commit batch input/output, manifests, rejected responses, snapshots,
previews, reports, dry-runs, audits, or backups. These artifacts remain local
and can be regenerated or retained for audit outside Git.
