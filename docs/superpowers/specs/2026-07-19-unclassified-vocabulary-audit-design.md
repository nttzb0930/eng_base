# Unclassified Vocabulary Audit Design

## Goal

Add a deterministic, offline command that explains which canonical vocabulary
items still have no Topic after classification. The audit must separate clear
grammar/function words from semantic content-word recovery candidates and from
records that need manual or normalization review.

The command is diagnostic only. It must not call an AI provider, mutate the
canonical catalog, or write PostgreSQL.

## Command and ownership

The API workspace owns the command because vocabulary data workflows live under
`apps/api/scripts/vocabulary`:

```powershell
pnpm --filter @repo/api data:audit-unclassified-topics
```

Implementation stays in
`apps/api/scripts/vocabulary/topic-classification/`. Pure bucketing behavior is
exported from a focused module and exercised without filesystem, provider, or
database dependencies. The CLI is only responsible for loading the canonical
catalog, invoking the pure audit, and atomically writing local reports.

## Input and stable identity

The audit subject is `data/vocabulary/vocabulary-catalog.json`. It also loads
`data/vocabulary/topics.json` to apply the existing canonical source
validation. The audit uses the catalog after the reviewed classification merge,
so it does not depend on ignored manifests or provider outputs that may have
been deleted.

Only records whose `topics` array is empty enter the audit. Every report record
contains:

- a one-based `catalogIndex` for local traceability;
- `word`, `normalizedWord`, `pos`, and `cefrLevel` as the stable vocabulary
  identity context;
- `primaryMeaningVi` and `meaningVi` for review;
- machine-readable `reasons` explaining its bucket or warning.

The audit preserves catalog order so repeated runs over the same catalog are
stable and reviewable.

## Bucketing rules

### Function words

`function-words.json` receives unclassified records whose normalized POS is one
of:

- `pronoun`
- `preposition`
- `determiner`
- `conjunction`
- `modal auxiliary`
- `be-verb`
- `do-verb`
- `have-verb`

These records remain valid vocabulary, but the semantic Topic classifier must
not force them into an unrelated learning Topic.

### Content recovery candidates

`content-recovery-candidates.json` receives unclassified records whose POS is
`noun`, `adjective`, or `verb`. These records are candidates for a later,
separately reviewed recovery-classification workflow. The audit does not assign
Topics itself.

### Normalization review

`normalization-review.json` receives all remaining unclassified records,
including `adverb`, `number`, `interjection`, blank POS, and unknown POS values.
The first version deliberately avoids semantic guesses such as deciding which
sense of `bank` or `ball` is correct. Missing required identity or meaning
fields remain canonical source validation failures rather than audit warnings.

The three primary buckets are mutually exclusive. Their record counts must sum
to the total number of unclassified catalog items.

## Output contract

Reports are written below the ignored local directory:

```text
data/vocabulary/working/topic-classification/audit/
  function-words.json
  content-recovery-candidates.json
  normalization-review.json
```

Each file uses a versioned JSON envelope:

```json
{
  "schemaVersion": 1,
  "category": "function-words",
  "totalRecords": 75,
  "records": []
}
```

The files omit timestamps so the same catalog produces byte-stable output.
Writing uses temporary files followed by rename. Validation finishes before any
target file is replaced, preventing a partial report set when input is invalid.

The CLI prints one bounded JSON summary containing the total catalog size,
classified and unclassified counts, the three bucket counts, output directory,
`providerCalled: false`, and `databaseUpdated: false`. It never prints the full
catalog or meanings.

## Validation and failure behavior

Before auditing, the command uses the existing canonical vocabulary validation.
It exits nonzero without replacing reports when:

- the catalog cannot be read or parsed;
- canonical vocabulary invariants fail;
- a report record cannot be assigned to exactly one primary bucket;
- bucket counts do not reconcile with the unclassified total;
- an atomic write fails.

Existing report files may be replaced only after the complete audit result is
valid. The command never reads environment provider credentials and never
constructs a Prisma client.

## Tests

Pure behavioral tests must prove:

1. known grammar POS values enter the function-word bucket;
2. noun, adjective, and verb records enter content recovery;
3. adverb, number, interjection, blank, and unknown POS values enter
   normalization review;
4. only records with empty `topics` are audited;
5. buckets are mutually exclusive and counts reconcile;
6. input records are not mutated;
7. repeated audit calls return equivalent, ordered results;
8. unknown and ambiguous POS reasons are emitted without semantic inference.

An integration-level CLI test is unnecessary because the filesystem adapter is
thin. The focused pure test joins the existing standalone vocabulary workflow
gate, and package type-check/lint validate the command wiring and package script.

## Documentation

The canonical vocabulary pipeline guide will document the command after the
classification merge and before Topic expansion. It will state that audit
reports are local generated artifacts and that this command does not authorize
recovery classification, Topic expansion, catalog mutation, provider calls, or
database synchronization.
