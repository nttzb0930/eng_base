# Topic Expansion CLI Observability Design

## Goal

Make `data:generate-topic-expansion` readable for people while preserving a
stable machine-readable mode. Reporting Topic deficits must remain an offline,
deterministic operation that does not call an AI provider, mutate the canonical
catalog, or write PostgreSQL.

This change covers CLI observability only. It does not change deficit
calculation, the 30-word default, expansion generation, review acceptance, or
catalog merge behavior.

## Command modes

Running without a Topic slug prints a grouped human-readable report:

```powershell
pnpm --filter @repo/api data:generate-topic-expansion
```

Automation requests compact JSON explicitly:

```powershell
pnpm --filter @repo/api data:generate-topic-expansion -- --json
```

Passing a Topic slug continues to generate one review artifact:

```powershell
pnpm --filter @repo/api data:generate-topic-expansion -- transportation
```

The argument parser ignores the standard pnpm delimiter `--`, treats `--json`
as a flag, and treats the first remaining non-flag argument as the Topic slug.
Unknown flags and multiple Topic slugs fail instead of being silently ignored.

## Deficit report model

A pure formatter receives the validated bilingual Topic taxonomy, calculated
deficits, configured minimum, and canonical catalog count. It produces a
versioned report containing:

- `minimumWords`;
- `totalTopics`;
- `deficientTopics`;
- `emptyTopics`;
- `requestedNewWords`;
- `catalogItems`;
- deficit groups in taxonomy order;
- each Topic's slug, English/Vietnamese title, existing count, and requested
  count;
- `providerCalled: false` and `databaseUpdated: false`.

Groups use the taxonomy's English and Vietnamese group names. Topics preserve
taxonomy order inside each group. The report contains no timestamp, so the same
catalog, taxonomy, and minimum produce byte-stable JSON.

## Human-readable output

Default deficit output starts with a bounded summary:

```text
Vocabulary Topic Expansion Deficits

Minimum words/topic : 30
Total topics        : 103
Deficient topics    : 92
Empty topics        : 11
New words required  : 1,914
```

It then prints one section per affected bilingual group and one aligned row per
deficient Topic:

```text
Technology / Công nghệ
  artificial-intelligence      0 / 30    missing 30
  technology                  23 / 30    missing  7
```

The footer prints the full report path plus explicit `Provider called: no` and
`Database updated: no`. Formatting must work in Windows terminals without ANSI
color or Unicode box-drawing dependencies.

## Machine-readable output and artifact

Both human and `--json` modes atomically write the complete report to:

```text
data/vocabulary/working/topic-expansion/deficits.json
```

The directory is already ignored. The CLI validates the complete report before
creating or replacing the file. `--json` prints the same report envelope as one
compact JSON line and no human table, allowing scripts to parse stdout.

## Generation progress

When a Topic slug is supplied, the existing provider contract and review
artifact remain unchanged. Human mode prints a bounded start line before the
provider call and a completion block containing Topic, generated count, review
artifact path, and the fact that PostgreSQL was not updated.

`--json` generation mode emits JSONL `generation-start` and
`generation-created-for-review` events instead. It never logs prompts, provider
responses, meanings, examples, credentials, or provider URLs.

Provider failures continue to exit nonzero through the existing sanitized
terminal boundary. A failed generation does not create or replace a review
artifact.

## Ownership and files

- Pure report construction and text formatting live beside
  `topic-expansion.ts` under
  `apps/api/scripts/vocabulary/topic-expansion/`.
- `generate-topic-expansion.ts` owns argument parsing, canonical file loading,
  atomic local writes, provider invocation, and terminal output selection.
- `topic-expansion.test.ts` verifies report totals, bilingual grouping,
  taxonomy order, readable text, stable output, and JSON-safe shapes.
- `docs/data/vocabulary-pipeline.md` owns the operating commands and explains
  the difference between default and `--json` output.

No root utility, cross-runtime package, database adapter, or environment
configuration is introduced.

## Verification

Tests must prove:

1. report totals reconcile with calculated deficits;
2. zero-count Topics contribute to `emptyTopics`;
3. groups and Topics preserve taxonomy order;
4. English and Vietnamese group metadata appear in the human output;
5. large counts are readable and every deficient Topic appears once;
6. repeated report construction and formatting are deterministic;
7. `--json` selects machine output without being parsed as a Topic slug;
8. no-slug modes report `providerCalled: false` and
   `databaseUpdated: false`;
9. existing expansion validation and exact ten-example requirements remain
   green.

The implementation must also run the standalone vocabulary workflow gate,
API type-check/lint, and the real no-slug command. Real provider generation is
not a verification step and requires separate explicit authorization.
