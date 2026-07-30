# Licensed Basic Content Acquisition Design

## Goal

Extend the approved licensed TOEIC acquisition design into a staged,
source-authorized pipeline for Dautoeic content that is both anonymously
readable and explicitly classified by the source as basic/public/free.

The pipeline inventories, downloads, normalizes, validates, and stores private
canonical packages for Mock Test, Grammar, Reading, Vocabulary, Listening,
Pronunciation, and public Blog content. Each learning domain receives its own
canonical schema and review boundary. No source content is published
automatically.

This design extends rather than replaces:

- `2026-07-30-licensed-toeic-content-pipeline-design.md`;
- ADR 0022, which keeps TOEIC certificate learning owned by Course
  `toeic-600`;
- the existing Reading, Vocabulary, Course Content, and Admin ownership
  decisions.

## Authorization Boundary

An anonymous API response is a technical accessibility fact, not a license.
Operators remain responsible for confirming that the configured license permits
retrieval, storage, transformation, review, and publication of every selected
content class.

The basic acquisition policy permits only records satisfying the source's
public markers:

- `access_level = free`;
- `visibility = public`;
- `is_free = true`;
- `is_public = true`;
- `is_hidden = false`.

When a table has no explicit access marker, an allowlisted domain adapter may
retrieve only rows returned anonymously and must record `accessClassification`
as `ANONYMOUS_UNCLASSIFIED`. Those packages cannot be imported or published
until an Admin confirms their license classification.

The basic policy always excludes:

- `access_level = pro`;
- `access_level = course`;
- `visibility = private`;
- `is_free = false`;
- hidden rows;
- user-owned sets unless their source classification explicitly marks them as
  public and their license permits reuse;
- profiles, attempts, answers submitted by learners, progress, notes, starred
  items, payments, subscriptions, feedback, device sessions, and analytics;
- privileged RPCs or records not returned to the configured anonymous
  identity.

The adapter never guesses identifiers, bypasses row-level security, changes
authorization context, or treats a UI-only access bug as permission.

## Verified Source Inventory Snapshot

The read-only audit performed on 2026-07-30 observed the following anonymous
counts. These are inventory evidence, not fixed acceptance counts:

| Domain            | Anonymous rows observed                                                                 |
| ----------------- | --------------------------------------------------------------------------------------- |
| Mock Test         | 8 sets, 75 tests, 15,000 questions, 3,234 passages                                      |
| Vocabulary        | 307 parts, 65 sets, 11,724 words, 263 tests                                             |
| Grammar           | 16 topics, 70 subtopics, 752 questions                                                  |
| Listening         | 129 sets, 11,716 items                                                                  |
| Topic Listening   | 206 sets, 1,951 items                                                                   |
| Reading           | 70 passages                                                                             |
| Pronunciation     | 42 lessons                                                                              |
| Video             | 9 chapters, 136 lessons                                                                 |
| Course lessons    | 7 lessons                                                                               |
| Blog              | 20 articles                                                                             |
| Writing/quiz rows | Anonymous `SELECT` returned zero rows; absence and RLS filtering were not distinguished |

The audit also observed:

- 9 Listening sets classified `pro`;
- 108 Video lessons classified `course`;
- 5 Vocabulary sets classified `private`.

Those records are specifically excluded from the basic policy even when the
anonymous API returns their metadata or media URLs.

Inventory reports always use live source counts and break them down into
accepted, excluded, unclassified, invalid, and inaccessible categories.

## Scope

### Included

- a provider-neutral source catalog shared by domain adapters;
- strict access-classification filtering before content download;
- dry-run counts and media-size estimation for every included domain;
- private, resumable download with checksums and bounded concurrency;
- separate canonical schemas and validation reports per domain;
- source/license/version/access-classification provenance;
- idempotent draft or review-candidate import;
- domain-appropriate Admin review before publication;
- operating documentation and audit summaries.

### Excluded

- PRO, course, private, paid, hidden, and user-personal content;
- Video lessons and Course lesson content in the first basic pipeline;
- Writing content while anonymous inventory returns zero rows;
- automatic synchronization, scheduled jobs, or runtime source calls;
- learner attempt/scoring/progress changes;
- merging source Vocabulary directly into the canonical catalog without
  duplicate review;
- mapping source Reading levels to CEFR automatically;
- downloading or publishing content before a live inventory has been reviewed.

Video and Course content remain excluded even when a raw URL is anonymously
reachable because their source classification is not basic/free. A future
license-specific design may add them.

## Delivery Phases

The work proceeds as independently reviewable vertical slices:

1. **Shared acquisition foundation**
   - access-classification policy;
   - live inventory and size estimation;
   - private storage, checkpoint, rate limit, retry, redaction, and manifest;
   - provider-neutral domain adapter interface.
2. **Mock Test**
   - implement the already approved TOEIC design;
   - validate complete 200-question tests;
   - Course-owned `toeic-600` draft and Admin publication.
3. **Grammar**
   - public topics/subtopics/questions;
   - correct answer and bilingual explanation validation;
   - Course-owned grammar bank draft and Admin publication.
4. **Reading**
   - public passages and nested questions;
   - preserve source level without inventing CEFR;
   - import as review candidates;
   - require Admin CEFR/Topic classification before publishing through the
     existing Reading capability.
5. **Vocabulary**
   - public sets/parts/words only;
   - preserve meanings, examples, IPA, phrases, synonyms, audio, and images;
   - import into a staging/review capability;
   - merge accepted items through Vocabulary's existing canonical duplicate and
     normalization rules.
6. **Listening**
   - free sets/items only;
   - preserve audio, transcript, translation, difficulty, and TOEIC part;
   - dedicated Course-owned Listening drafts and Admin publication.
7. **Pronunciation and public Blog**
   - inventory as `ANONYMOUS_UNCLASSIFIED` where explicit free markers are
     absent;
   - canonical download is allowed only when the operator license manifest
     explicitly allowlists the domain;
   - import/publication requires a separate Admin classification decision.

Only the current phase is implemented and verified at a time. Later phases do
not block a completed earlier phase.

## Shared Source Catalog

The source adapter exposes a provider-neutral catalog:

```text
Source domain
  -> collection
      -> item summary
          -> content payload
          -> media descriptors
```

Every summary carries:

- provider;
- source domain;
- source collection ID;
- source item ID;
- source order;
- raw access markers;
- normalized access classification;
- hidden state;
- source version inputs;
- source URL.

Normalized access classifications are:

- `BASIC_FREE`;
- `PUBLIC`;
- `ANONYMOUS_UNCLASSIFIED`;
- `EXCLUDED_PRO`;
- `EXCLUDED_COURSE`;
- `EXCLUDED_PRIVATE`;
- `EXCLUDED_HIDDEN`;
- `EXCLUDED_USER_DATA`.

The downloader accepts only `BASIC_FREE` and `PUBLIC`. It accepts
`ANONYMOUS_UNCLASSIFIED` only when both the operator domain allowlist and
license manifest explicitly name that domain; the resulting package remains
review-only until classification.

## Inventory and Dry Run

The first operating command is always inventory. It performs metadata and
`HEAD`/bounded size requests without downloading media bodies or connecting to
PostgreSQL.

The report includes, per domain:

- source collections/items visible;
- accepted basic/public items;
- excluded PRO/course/private/hidden/user items;
- unclassified items;
- expected question/word/passage/audio/image counts;
- known media bytes;
- unknown media size count;
- estimated low/high storage requirement;
- duplicate media URL/digest candidates;
- source-shape errors.

The operator approves the inventory artifact before download. The downloader
records the approved inventory checksum and refuses to run when live
classification broadens beyond it without a new inventory approval.

## Private Canonical Storage

All domains use:

```text
var/licensed-content/dautoeic/
  inventories/
  mock-test/
  grammar/
  reading/
  vocabulary/
  listening/
  pronunciation/
  blog/
  rejected/
```

The entire root remains ignored by Git. Each item version contains:

```text
manifest.json
content.json
validation.json
media/
```

The manifest stores:

- schema version;
- provider/domain/collection/item identities;
- source and retrieval timestamps;
- source version or deterministic source digest;
- normalized access classification and raw access markers;
- license name/reference/intended use;
- approved inventory checksum;
- file/media hashes, byte sizes, and MIME types;
- validation state.

It never stores credentials, signed authorization headers, database IDs,
absolute filesystem paths, publication status, or learner state.

## Domain Canonical Contracts

### Mock Test

The existing TOEIC canonical contract remains authoritative: exactly 200
questions, Parts 1–7, required distribution, stimuli, options, answer key,
transcript, image/audio, and checksum validation.

### Grammar

Each package contains one public topic tree or versioned source batch:

- topic and subtopic identities/titles/descriptions;
- source level and order;
- question text;
- A–D options;
- exactly one answer key;
- English and Vietnamese explanations when supplied;
- vocabulary annotations when supplied.

Blank questions/options, invalid answer labels, duplicate source IDs, and
unresolved topic/subtopic references are blocking.

### Reading

Each package contains:

- source title/topic/level/order;
- HTML body preserved as source content;
- sanitized review rendering representation;
- nested questions;
- choices;
- correct answer;
- explanation;
- translation;
- source vocabulary annotations.

Source `level` is not CEFR. Import creates a Reading review candidate with
`sourceLevel`; Admin must select a canonical CEFR level and Topic before
publication. HTML is sanitized at rendering and import boundaries.

### Vocabulary

Each package contains:

- public set, test, and part identity/order;
- word and normalized source word;
- IPA;
- structured meanings with part of speech, meaning, and example;
- phrases and synonyms;
- source difficulty;
- verified UK/US/default audio and image media.

Canonical source packages do not directly mutate `vocabulary_items`. Import
creates staging candidates. Existing normalized-word/meaning rules decide
whether Admin merges, updates, or rejects a candidate.

### Listening

Each package contains:

- free set identity, collection/chapter, order, difficulty, and TOEIC part;
- item identity/order/group;
- English title/sentence;
- Vietnamese title/translation;
- transcript and hint;
- duration, source, tags, and verified audio.

An item without verified audio or a set without `access_level=free` is rejected
from basic import.

### Pronunciation and Blog

Pronunciation preserves theory, sound symbols, examples, enriched sentences,
audio cache references, diagram media, and source video references. Blog
preserves slug, title, excerpt, category, author, content, cover image, and read
time.

Because neither domain currently exposes an explicit free marker in the
audited row shape, both require operator license allowlisting and remain
review-only until Admin classification. They are not included in the first
database migration.

## Domain Ownership and Persistence

### Mock Test and Listening

Both are TOEIC learning capabilities linked to Course `toeic-600`. They use
dedicated aggregates because Course lesson challenges cannot represent shared
stimuli, long audio, transcripts, TOEIC parts, or test-level publication.

### Grammar

Grammar is a Course-owned practice bank linked to `toeic-600`. It does not
reuse Vocabulary membership or learner progress. Learner grammar attempts are
outside this acquisition project.

### Reading

The existing Reading capability owns published passage behavior. Source
candidates use a staging table until Admin supplies CEFR and Topic; accepted
candidates are copied into Reading drafts through a Reading-owned use case.

### Vocabulary

The existing Vocabulary capability owns canonical vocabulary. Source
candidates remain in a staging table and can only merge through a
Vocabulary-owned use case with duplicate review.

### Pronunciation and Blog

Canonical packages only in this design. Persistence ownership requires a
separate accepted capability design before import.

No phase adds learner attempts, progress, scoring, XP, SRS state, or enrollment.

## Idempotency and Publication

Every domain uses:

```text
provider + domain + sourceItemId
```

as source identity.

- Missing identity creates a draft or review candidate.
- Unchanged checksum is skipped.
- Changed draft/candidate is transactionally replaced.
- Published or merged content is never overwritten.
- Excluded or invalid content is never imported.
- Removing content from a later source inventory does not delete local content.

Admin publication revalidates the complete domain aggregate. Import never
publishes. Vocabulary merging is a separate accepted action rather than
publication.

## Admin Review

One shared source-inventory screen shows:

- live/approved inventory checksums;
- domain counts and access classifications;
- included/excluded/unclassified totals;
- download/validation/import state;
- provenance and license reference;
- media completeness and storage size.

Each imported domain uses its owning Admin feature:

- Mock Test review and publication;
- Grammar bank review and publication;
- Reading candidate classification and Reading draft publication;
- Vocabulary candidate deduplication and merge;
- Listening review and publication.

The Admin UI never exposes credentials, absolute storage paths, raw signed
source URLs, or user data.

## Rate Limiting and Source Safety

All source operations use:

- conservative configurable concurrency;
- request timeouts and maximum response sizes;
- `Retry-After`;
- exponential retry for `429` and `5xx` only;
- no retry for `401`, `403`, RLS denial, or source-shape validation;
- HTTPS host allowlists;
- streamed media writes;
- checkpoint/resume;
- deterministic bounded logs.

Inventory and download are explicit operator commands. They are never called
by app startup, HTTP routes, builds, migrations, seeds, tests, or CI.

## Testing

All automated tests use synthetic repository-authored fixtures and mocked
source responses.

Tests prove:

- access classification rejects PRO/course/private/hidden/user rows;
- unclassified domains require explicit license allowlisting;
- inventory separates accepted/excluded/unclassified counts;
- approved inventory checksum prevents unreviewed scope expansion;
- source credentials and content are redacted from failures;
- private path safety and media checksum/resume behavior;
- every domain canonical validator;
- idempotent draft/candidate import;
- published/merged content protection;
- Course `toeic-600` ownership where required;
- Reading CEFR/Topic classification gate;
- Vocabulary duplicate-review gate;
- Listening free-only enforcement;
- Admin authorization and architecture boundaries.

Real network calls, media downloads, migrations, imports, merges, and
publication are excluded from automated verification.

## Operating Sequence

For each phase:

1. implement and verify offline code;
2. run live read-only inventory;
3. inspect access classification and storage estimate;
4. explicitly approve the inventory checksum;
5. run resumable private download;
6. validate canonical packages offline;
7. explicitly approve the target database;
8. apply the phase migration;
9. import drafts or candidates;
10. review in Admin;
11. publish or merge individual accepted items.

The approved inventory is a mandatory checkpoint. A broad “download all”
command cannot silently include newly visible PRO/course/private content.

## Acceptance Criteria

The extended basic pipeline is complete when:

- all audited learning domains appear in live inventory with truthful
  accepted/excluded/unclassified counts;
- PRO, course, private, hidden, and user data are demonstrably rejected before
  content download;
- accepted media size is known or bounded before download;
- every downloaded item becomes a checksummed private canonical package;
- each domain validates independently and produces safe reports;
- imports are idempotent and draft/review-only;
- published/merged content is protected from source overwrite;
- Mock Test, Grammar, Reading, Vocabulary, and Listening use their correct
  ownership and Admin review boundary;
- Pronunciation and Blog remain canonical review-only until their persistence
  ownership is separately approved;
- no licensed content, media, credential, or user data enters Git or logs;
- all repository architecture, test, type, lint, format, and build gates pass.
