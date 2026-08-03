# Vocabulary Audio Catalog Reconciliation Design

## Purpose

English Base currently has 4,206 Vocabulary rows with pronunciation audio in
PostgreSQL, while the canonical
`data/vocabulary/vocabulary-catalog.json` contains only 2,161. The 2,045
database-only values must be reviewed and copied into the canonical catalog
before the production Vocabulary bootstrap can safely synchronize managed
fields.

This design covers a one-time, repeatable reconciliation workflow. It does not
call the Free Dictionary API and does not write PostgreSQL.

## Evidence and Current Risk

All 2,045 database-only values have `audio_source` equal to
`free-dictionary-api` and use the `api.dictionaryapi.dev` host. The ignored
audio-enrichment report records a database run that started with 3,595 audio
values and added 611, producing the current total of 4,206. Earlier committed
catalog revisions contain only 2,161 audio values.

The production bootstrap correctly treats the versioned catalog as canonical.
Applying its current plan would therefore clear the 2,045 database-only audio
value/source pairs. Reconciliation must happen before bootstrap apply.

## Considered Approaches

### Targeted audio reconciliation (selected)

Add a narrow command that reads only catalog identities and database audio
fields, classifies every comparison, and changes only `audioUrl` and
`audioSource` in the catalog after explicit confirmation. This has the smallest
mutation surface and makes the 2,045-value recovery independently testable.

### Reuse `data:export-vocab`

The existing exporter also replaces primary examples and example collections.
Using it would mix unrelated canonical changes into the audio recovery and
make review substantially harder. It is not suitable for this repair.

### Manual JSON editing

A generated ad hoc patch could recover the current database, but it would not
provide identity validation, conflict reporting, drift detection, or a
repeatable audit path. It is rejected.

## Command Interface

The API package exposes:

```text
pnpm --filter @repo/api data:reconcile-vocabulary-audio -- plan
pnpm --filter @repo/api data:reconcile-vocabulary-audio -- apply --confirm <token>
```

The shorter `data:reconcile-audio` name is intentionally avoided because the
operation owns Vocabulary catalog data specifically.

`plan` is read-only. It loads and validates the canonical catalog, reads a
bounded database projection, prints deterministic counts and fingerprints, and
writes an ignored report under
`data/vocabulary/working/dictionary-enrichment/audio-reconciliation-plan.json`.

`apply` repeats planning against the current catalog and database. It requires
the exact confirmation token from that plan, writes a timestamped ignored
catalog backup, and atomically replaces only the canonical catalog file. A
catalog or database audio drift changes the token and blocks application.

## Architecture

The workflow remains owned by Vocabulary dictionary enrichment:

```text
apps/api/scripts/vocabulary/dictionary-enrichment/
  vocabulary-audio-reconciliation.ts       pure identity and diff planner
  vocabulary-audio-reconciliation.test.ts  planner and safety tests
  reconcile-vocabulary-audio.ts             filesystem/Prisma CLI orchestration
```

The pure planner consumes `VocabularyCatalogItem[]` and database audio rows,
uses the existing `vocabularyIdentity` helper, and returns a serializable plan.
The CLI uses `scripts/support/script-prisma.ts` for database access and the
existing canonical catalog validator before any report or catalog write.

## Identity and Classification Rules

Identity remains `normalizedWord + pos + cefrLevel`. Numeric database IDs are
diagnostic metadata only and never control catalog matching.

Each catalog identity is classified exactly once:

- `import`: catalog has neither audio field and DB has a valid URL/source pair;
- `unchanged`: both sides have the same URL/source pair;
- `catalog-only`: catalog has a complete pair and DB has neither field;
- `conflict`: both sides have complete but different pairs;
- `invalid-partial`: either side contains only URL or only source;
- `invalid-url`: the database URL is not HTTPS or cannot be parsed;
- `unsupported-source`: the database source is not `free-dictionary-api`;
- `missing-database-identity`: a catalog identity has no database row;
- `external-database-identity`: a database identity is absent from catalog;
- `duplicate-database-identity`: more than one database row has the same
  canonical identity.

Only `import` entries are eligible for automatic catalog mutation. Apply is
blocked when any conflict, invalid partial pair, invalid URL, unsupported
source, missing identity, or duplicate identity exists. External database
identities are reported and retained outside catalog; they do not block apply
because the production bootstrap already preserves external records.

For `free-dictionary-api`, an importable URL must use HTTPS and the exact host
`api.dictionaryapi.dev`. The URL is preserved byte-for-byte after validation;
the workflow does not call the provider or rewrite pronunciation variants.

## Determinism and Confirmation

The source fingerprint hashes the validated catalog. The live audio
fingerprint hashes sorted database identities with `audioUrl` and
`audioSource`. The plan fingerprint hashes sorted classifications and proposed
imports. The confirmation token binds all three fingerprints plus the
sanitized database target.

Reports and console output must not contain connection credentials. Samples
are bounded; the complete ignored report may include identities and audio URLs
for human review.

## Catalog Write Behavior

Apply preserves catalog order and every non-audio property. For an `import`
entry it sets exactly:

```json
{
  "audioUrl": "<database audio_url>",
  "audioSource": "free-dictionary-api"
}
```

The command writes a timestamped backup under `data/vocabulary/backups/`,
writes the replacement to a sibling temporary file, and renames it over the
catalog only after validation succeeds. The final catalog is validated again
and must have the same record count and identity sequence as the source.

## Expected Current Plan

Against the current local environment, review expects:

```text
catalog records:             7,429
database identities:         7,429
catalog audio before:        2,161
eligible imports:            2,045
catalog audio after:         4,206
conflicts/invalid/duplicates:    0
```

These are review expectations, not hard-coded planner values. A mismatch stops
the operator sequence for investigation.

## Verification and Operator Sequence

Tests must prove classification completeness, exact identity matching,
unsupported host/source rejection, partial-pair rejection, conflict blocking,
external-row retention, deterministic fingerprints, confirmation invalidation,
and preservation of catalog order and non-audio fields.

The reviewed operator sequence is:

1. Run reconciliation `plan` and inspect all counts.
2. Review the ignored report and Git status; `plan` must not change catalog.
3. Run confirmed reconciliation `apply` only after explicit user approval.
4. Validate the catalog and inspect the exact Git diff.
5. Commit the canonical catalog change separately from implementation code.
6. Run production Vocabulary bootstrap `plan` and `dry-run` again.
7. Confirm the bootstrap proposes zero audio clearing and zero destructive
   changes.
8. Take a fresh database backup and obtain separate explicit approval before
   any bootstrap `apply`.

## Follow-up Boundary

Preventing future database/catalog divergence is a separate follow-up design.
The preferred direction is catalog-first audio enrichment followed by the safe
bootstrap, but this repair does not silently change or remove the existing
provider command. The pipeline guide will mark direct database enrichment as a
legacy write path that requires reconciliation before bootstrap.

## Success Criteria

- The 2,045 valid database-only audio pairs can be imported without changing
  any other catalog field.
- Planning performs no catalog, database, or provider write.
- Apply cannot use a token from a different catalog or live audio state.
- Invalid or ambiguous records stop the canonical write.
- After reconciliation, production bootstrap no longer proposes clearing the
  recovered pronunciation audio.
- PostgreSQL remains unchanged until a separately reviewed bootstrap apply.
