# Topic Localization and Vocabulary Runner Observability

## Status

Approved design for implementation planning. This specification covers two
related improvements to the canonical Topic workflow:

1. bilingual Topic taxonomy and localized Topic learning delivery;
2. observable, resumable, fingerprint-bound Topic classification runs.

It does not authorize provider calls, catalog merges, database seeds, or data
resets. Those remain explicit operator actions under the vocabulary pipeline.

## Goals

- Preserve the 103 canonical Topic slugs and their ordering.
- Add manually authored Vietnamese Topic titles, descriptions, and group names.
- Use the bilingual taxonomy in classification and expansion prompts.
- Return localized Topic presentation through the API without duplicating
  frontend translation sources.
- Group the Web Topic learning catalog by localized Topic group.
- Always show useful classification progress while keeping detailed diagnostics
  opt-in.
- Bind generated classification output to the exact input, taxonomy, prompt,
  provider, and model that produced it.
- Make partial failure visible through logs, artifacts, and a non-zero exit code.

## Non-goals

- Translating vocabulary meanings or examples as part of this change.
- Automatically generating or accepting the 103 Vietnamese Topic translations.
- Changing Topic slugs based on locale.
- Adding a generic localization framework to the API.
- Running Topic expansion, database reset, broad `db:seed`, or provider work as
  part of implementation verification.
- Persisting provider prompts, raw responses, API keys, or authorization values
  in logs.

## Canonical taxonomy contract

`data/vocabulary/topics.json` remains the only canonical Topic taxonomy. The
existing English fields remain unchanged for compatibility, and three required
Vietnamese fields are added:

```json
{
  "slug": "personal-information",
  "title": "Personal Information",
  "titleVi": "Thông tin cá nhân",
  "description": "Vocabulary related to personal information.",
  "descriptionVi": "Từ vựng liên quan đến thông tin cá nhân.",
  "group": "People",
  "groupVi": "Con người",
  "order": 1
}
```

The taxonomy validator must require non-empty `titleVi`, `descriptionVi`, and
`groupVi` for every Topic. The existing invariants remain: exactly 103 Topics,
unique slugs, unique ordering, and no unknown catalog Topic references.

Vietnamese content is authored manually and reviewed as canonical source data.
No AI provider participates in translation acceptance.

## Catalog localization boundary

`data/vocabulary/vocabulary-catalog.json` references Topics only by canonical
slug:

```json
{
  "word": "passport",
  "normalizedWord": "passport",
  "topics": ["travel-documents"]
}
```

The catalog must never embed Topic titles, descriptions, groups, translation
objects, or locale-specific Topic identities. Topic slugs are stable business
identity; all English and Vietnamese presentation content belongs exclusively
to `topics.json`.

Runtime delivery joins a vocabulary item's Topic slug to the persisted canonical
taxonomy, then projects `title`, `description`, and `group` for the requested
locale. Adding another locale therefore changes the taxonomy and delivery
projection without rewriting every vocabulary record.

Validators reject unknown catalog Topic slugs. They do not copy localized Topic
metadata into catalog records.

## Persistence model

The existing English `title` and `description` columns remain the English
source. The Topic persistence model adds nullable columns:

- `title_vi`;
- `description_vi`;
- `group_name`;
- `group_name_vi`.

Nullable columns allow schema migration without duplicating all canonical data
inside migration SQL. Canonical Topic synchronization populates all four
columns. API delivery falls back to English when a deployed environment has not
yet synchronized the new canonical values.

`data:seed-topics` must synchronize both languages and both group names while
preserving its existing relation replacement behavior. Broad `db:seed` remains
destructive development setup and is not repurposed as a production sync.

## API localization

Topic list and detail endpoints accept an optional validated locale:

```text
GET /topics?locale=vi
GET /topics/:slug?locale=en
```

Supported values are `vi` and `en`. The default is `en` to preserve existing
API behavior for callers that omit the parameter.

The wire contract remains presentation-oriented and returns localized fields:

```json
{
  "slug": "personal-information",
  "title": "Thông tin cá nhân",
  "description": "Từ vựng liên quan đến thông tin cá nhân.",
  "group": "Con người",
  "order": 1
}
```

The API Topic owner performs locale projection. Shared types gain the additive
localized `group` field but do not expose persistence names such as `title_vi`.
Unknown locale values fail request validation instead of silently selecting an
arbitrary language.

## Web Topic learning experience

The Web Topic resource API sends the active locale for list and detail
requests. Locale is part of every Topic query key so React Query never reuses
Vietnamese data for an English screen or vice versa.

The Topic catalog groups cards by the localized `group` value while retaining
canonical Topic `order` within each group. A Topic card links to the existing
localized detail route:

```text
/[locale]/topics/[slug]
```

The detail screen displays localized Topic title and description together with
its vocabulary and learner statistics. The slug remains stable across locales.

## Classification run identity

Each prepared batch already has `inputSha256`. A reusable output must also bind
to every input that can materially change classification:

- batch input hash;
- canonical catalog hash;
- Topic taxonomy hash;
- classification prompt hash;
- provider name;
- model name.

The runner derives one deterministic `executionSha256` from those values. A
versioned output contains the explicit metadata and the derived fingerprint:

```json
{
  "schemaVersion": 2,
  "batchId": "batch-001",
  "inputSha256": "...",
  "catalogSha256": "...",
  "topicTaxonomySha256": "...",
  "promptSha256": "...",
  "provider": "openai-compatible",
  "model": "gemini-3-flash",
  "executionSha256": "...",
  "records": []
}
```

An existing output is reusable only when its schema, metadata, fingerprint, and
classification records all validate against the current plan. A legacy,
malformed, or mismatched file is reported as stale and regenerated. This makes
resume safe without requiring operators to delete `working/` manually.

Rejected artifacts carry the same run identity plus a sanitized error. They
never block a retry; only a valid matching output is reusable.

## Progress and debug logging

Basic progress is always enabled:

```text
[classification] run-start total=60 pending=60 reused=0 concurrency=3
[classification] batch=batch-001 started progress=0/60
[classification] batch=batch-001 success elapsed=4.2s progress=1/60
[classification] batch=batch-002 rejected elapsed=5.1s error=HTTP_429 progress=2/60
[classification] run-finished success=59 rejected=1 reused=0 elapsed=92.4s
```

`VOCAB_AI_DEBUG=true` adds bounded diagnostics:

```text
[classification:debug] batch=batch-001 worker=1 inputHash=abc123 model=gemini-3-flash
[classification:debug] batch=batch-001 classified=46 unclassified=4
[classification:debug] batch=batch-003 reused executionHash=def456
```

Logging must never emit:

- API keys or authorization headers;
- database credentials;
- complete prompts;
- raw provider responses;
- full vocabulary batch payloads.

Provider errors are reduced to a stable error code, HTTP status when available,
and a bounded sanitized message. A run with any rejected or missing batch exits
non-zero after writing its final summary. A completely valid run exits zero.

## Concurrency and counters

`VOCAB_AI_CONCURRENCY` continues to control concurrent network workers. Shared
progress counters are updated in the JavaScript event loop after each terminal
batch outcome. Log entries include batch identity and deterministic totals, so
interleaved worker completion remains understandable.

The runner reports:

- total planned batches;
- valid outputs reused;
- stale outputs regenerated;
- provider successes;
- rejected batches;
- elapsed run and batch durations.

## Error handling and recovery

- Invalid canonical taxonomy: fail before creating a provider client.
- Unknown provider/model configuration: fail before processing the queue.
- Stale output: log and regenerate; do not treat it as an error.
- Provider/contract failure: write a fingerprint-bound rejected artifact and
  continue other batches.
- Any rejected or missing output at run end: non-zero process exit.
- Rerun: reuse matching successes and retry remaining batches.
- Merge: require every expected output to match the current execution identity.

## Testing strategy

Tests are written before implementation and cover observable behavior:

### Taxonomy and seed tests

- all 103 Topics require the three Vietnamese fields;
- English and Vietnamese group data survives seed-data loading;
- canonical Topic sync maps bilingual fields to persistence input;
- malformed or missing translations fail closed.

### API tests

- `locale=vi` returns Vietnamese title, description, and group;
- `locale=en` and omitted locale return English;
- missing Vietnamese persistence values fall back to English;
- unsupported locale values return the stable validation error contract.

### Web tests

- Topic resource requests include locale;
- Topic query keys include locale;
- Topic cards are grouped by localized group and ordered canonically;
- Topic detail retains the localized route and slug.

### Runner tests

- basic progress is always emitted;
- debug details appear only when `VOCAB_AI_DEBUG=true`;
- logs exclude configured secrets, prompt text, and raw response content;
- matching output is reused;
- mismatched or legacy output is regenerated;
- rejected batches produce non-zero exit status;
- concurrent completion yields correct final counters;
- merge rejects output from another execution fingerprint.

The standalone vocabulary workflow suite remains the primary pure verification
gate. Full repository type, lint, test, architecture, and build gates run before
handoff. Verification does not call providers or write PostgreSQL.

## Documentation updates

Implementation updates the canonical vocabulary pipeline guide and environment
guide with:

- the bilingual Topic contract;
- locale delivery behavior;
- `VOCAB_AI_DEBUG` semantics;
- fingerprint-based resume behavior;
- provider/base URL ownership;
- the distinction between implementation verification and explicit provider or
  database operations.
