# Vocabulary Pipeline Hardening Design

## Goal

Establish one reproducible vocabulary data pipeline with 103 canonical topics,
clear processing metadata, reviewable AI expansion, and a single dataset that
can safely seed PostgreSQL.

## Canonical sources

The repository has exactly two version-controlled runtime data sources:

- `data/vocabulary/topics.json`: the canonical taxonomy of 103 topics.
- `data/vocabulary/vocabulary-catalog.json`: the canonical vocabulary catalog.

`phase1-vocabulary.json` is renamed to `vocabulary-catalog.json`. Phase numbers,
`raw`, `master`, and `final` are forbidden in canonical dataset names because
the catalog is continuously enriched and versioned by Git.

Every script, seed path, test, and active document must use the canonical names.

Vocabulary scripts live under `apps/api/scripts/vocabulary/<flow>/`. The flow
owns its CLI adapters, pure helpers, and tests; a generic `scripts/lib` folder
is forbidden. Canonical data stays at the vocabulary root, prompts and human
reviews are versioned subfolders, and every machine-generated artifact is
written below `working/<flow>/`.

## Vocabulary item semantics

The legacy `enriched` field is renamed to
`dictionaryLookupCompleted`. It means that Dictionary API lookup completed
without an execution error. It does not promise that audio or an example was
found.

Actual enrichment is determined from the data:

- `audioUrl` means audio is available.
- `exampleEn` means an English example is available.
- `topics` contains canonical topic slugs.

Dictionary lookup, topic classification, and AI expansion are independent
processes. An AI-generated word starts with
`dictionaryLookupCompleted: false` even when the AI supplied an example.

## Canonical topic ownership

`topics.json` is the only topic definition source. The two legacy lists of 12
topics in `seed.ts` and `seed-vocab-topics.ts` must not remain as parallel
taxonomies.

Seeding reads the 103 definitions from `topics.json` and upserts them by slug.
Vocabulary relations are built from each catalog item's `topics` array. Topic
slugs not present in the taxonomy are rejected before any database write.

The database remains many-to-many. The current AI classifier assigns at most
one primary topic, but the catalog retains an array so reviewed data can add
more topic relations later without changing the format.

## Existing-word classification flow

1. Read `vocabulary-catalog.json`.
2. Create deterministic batches containing stable record IDs.
3. Ask the configured AI provider to select zero or one slug from
   `topics.json` for every record.
4. Validate every batch against its manifest and the canonical taxonomy.
5. Produce a coverage report for missing, duplicated, rejected, and
   unclassified records.
6. Merge validated results into a temporary catalog.
7. Atomically replace the canonical catalog only when all blocking validation
   checks pass.

Merging uses stable record IDs and preserves dictionary, audio, example, CEFR,
and provenance fields. It only changes the `topics` field.

## Topic expansion flow

1. Measure topic coverage from the classified canonical catalog.
2. Select only topics below the configured minimum vocabulary count.
3. Generate only the number of words needed to reach the minimum.
4. Store one review artifact per target topic.
5. Validate required fields, CEFR, topic slug, provenance, and duplicates by
   normalized word plus part of speech.
6. Require the artifact to be accepted before merging it into the catalog.
7. Merge without overwriting existing vocabulary records.
8. Run dictionary lookup for newly accepted words in a separate step.

New records use `source: "ai-topic-expansion"`,
`exampleSource: "ai-topic-expansion"`, the target topic slug, and
`dictionaryLookupCompleted: false` until Dictionary API lookup is attempted.
Every generated word contains exactly 10 distinct English-Vietnamese example
pairs by default. The provider schema and the business validator both enforce
the configured count; incomplete output is rejected rather than truncated.

## Generated artifact policy

Generated working files are not application inputs and are not committed:

- classification `input/`, `output/`, `rejected/`, and `jobs/`;
- classification manifests, summaries, unclassified reports, CSV exports,
  per-topic reports, and ad hoc subsets;
- expansion `output/`;
- timestamped catalog backups and temporary files.
- normalization and POS-correction batches, proposals, reports, dry-runs,
  previews, snapshots, and database audits.

They live under `data/vocabulary/working/` or `data/vocabulary/backups/`, both
covered by `.gitignore`. The source scripts and prompts remain versioned.

AI output may be retained outside Git for audit, but PostgreSQL and application
runtime never read it directly.

## Validation contract

The shared validation boundary rejects a catalog when any of these conditions
is true:

- topic slugs are empty or duplicated;
- an item references a topic missing from `topics.json`;
- vocabulary identity `normalizedWord + pos + cefrLevel` is duplicated;
- required vocabulary fields are empty;
- a generated item has invalid CEFR or provenance;
- a classification batch contains unknown, duplicated, or missing record IDs.

Validation reports the number of catalog items, classified items, unclassified
items, used topic slugs, and unused taxonomy topics. Unclassified vocabulary is
reported but may remain in the catalog; structural inconsistencies block merge
and seed.

## Database flow

Only validated canonical files feed the database:

```text
topics.json -------------------+
                               +--> validate --> seed.ts --> PostgreSQL
vocabulary-catalog.json -------+
```

`seed.ts` resets relations before topics, upserts canonical topics, seeds
vocabulary items, and inserts item-topic relations in chunks with duplicate
protection. Generated working artifacts never participate in seed execution.

## Testing

Tests must cover:

- migration of `enriched` to `dictionaryLookupCompleted` without losing other
  fields;
- taxonomy uniqueness and the exact canonical count of 103;
- rejection of unknown topic slugs and duplicate vocabulary identities;
- deterministic classification batching and manifest integrity;
- classification merge preserving all non-topic fields;
- expansion duplicate rejection and provenance defaults;
- seed source architecture forbidding hard-coded topic arrays and legacy file
  names;
- `.gitignore` coverage for every generated working directory.

Each behavioral change follows red-green-refactor. Data-producing commands run
against a temporary copy during tests and must never mutate the canonical
catalog on failure.

## Scope exclusions

- No database schema migration is required.
- No redesign of the Topics API, Web, or Admin UI.
- No automatic acceptance of AI-generated vocabulary.
- No commitment of current batch and report artifacts.
- No change to the 103 approved topic definitions beyond validation and
  normalization required by their existing schema.
