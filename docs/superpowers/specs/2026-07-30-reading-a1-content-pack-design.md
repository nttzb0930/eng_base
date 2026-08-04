# Reading A1 Content Pack Design

## Goal

Create the first reviewable production content pack for the existing Reading
A1 capability. The repository owns twelve manually authored international
English passages, their comprehension questions, and their answer options as a
versioned JSON dataset. An explicit importer validates the complete pack and
synchronizes it to Reading drafts without publishing content or modifying
learner progress.

This work supplies content to the already implemented Reading persistence, API,
Admin, and Web flow. It does not generate content at runtime and does not call
an AI provider.

## Scope

The content pack contains exactly twelve A1 passages:

| Slug                      | Title                   | Canonical Topic        |
| ------------------------- | ----------------------- | ---------------------- |
| `meeting-a-new-neighbor`  | Meeting a New Neighbor  | `personal-information` |
| `sunday-with-my-family`   | Sunday with My Family   | `family`               |
| `marias-busy-morning`     | Maria's Busy Morning    | `daily-routine`        |
| `our-small-apartment`     | Our Small Apartment     | `home`                 |
| `lunch-at-the-cafe`       | Lunch at the Cafe       | `restaurant`           |
| `shopping-for-a-birthday` | Shopping for a Birthday | `shopping`             |
| `the-first-day-at-school` | The First Day at School | `school`               |
| `a-new-part-time-job`     | A New Part-Time Job     | `job`                  |
| `plans-for-a-rainy-day`   | Plans for a Rainy Day   | `weather`              |
| `taking-the-bus-downtown` | Taking the Bus Downtown | `transportation`       |
| `a-visit-to-the-doctor`   | A Visit to the Doctor   | `health`               |
| `a-weekend-by-the-sea`    | A Weekend by the Sea    | `travel`               |

The passages use internationally neutral people, places, routines, and
situations. They do not assume Vietnamese cultural knowledge and do not align
to the current Course/Unit hierarchy, whose seeded Units are generic CEFR
vocabulary buckets rather than a thematic curriculum.

Each passage has:

- CEFR level `A1`;
- one immutable kebab-case slug;
- one canonical Topic slug from `data/vocabulary/topics.json`;
- an estimated reading time of three minutes;
- an English body of 80 to 120 whitespace-delimited words;
- exactly four ordered comprehension questions;
- exactly three ordered options per question;
- exactly one correct option per question.

Questions cover direct information, time or location, event order, and simple
passage-supported inference across the pack. Every answer must be derivable
from the passage without outside knowledge. Distractors remain plausible in
the passage context but cannot create two defensible answers.

## Canonical Dataset

The source of truth is:

```text
data/reading/a1/passages.json
```

The root is an array of twelve passage records. Array position determines
question and option order; the JSON does not duplicate persistence IDs,
publication state, timestamps, or learner data.

Each record uses this shape:

```json
{
  "slug": "meeting-a-new-neighbor",
  "title": "Meeting a New Neighbor",
  "cefrLevel": "A1",
  "topicSlug": "personal-information",
  "estimatedMinutes": 3,
  "body": "English passage text.",
  "questions": [
    {
      "prompt": "Where do the neighbors meet?",
      "options": [
        { "text": "In the hall", "correct": true },
        { "text": "At a hotel", "correct": false },
        { "text": "At a supermarket", "correct": false }
      ]
    }
  ]
}
```

The dataset is manually authored and reviewed in Git. Provider output, runtime
generation, and automatically published content are outside this source
contract.

## Validation

Validation is split into blocking structural errors and non-blocking editorial
warnings.

Blocking validation runs before database access and rejects:

- a root value other than an array of exactly twelve records;
- unknown or additional JSON fields;
- a level other than `A1`;
- blank titles, bodies, prompts, or option text;
- invalid or duplicate passage slugs;
- duplicate question prompts within a passage after trim/case normalization;
- duplicate option text within a question after trim/case normalization;
- bodies outside the 80-to-120-word range;
- a value other than four questions or three options per question;
- a question without exactly one correct option;
- non-positive estimated reading minutes;
- a Topic slug absent from the versioned Topic taxonomy.

The content audit compares normalized words with the canonical A1 vocabulary
catalog. Unknown words, proper names, inflected forms, and catalog words above
A1 are reported for editorial review. These findings are warnings because the
catalog is not a complete English tokenizer or grammar authority. The report
does not silently rewrite prose.

Validation and audit functions are pure and operate without PostgreSQL,
environment secrets, or provider calls.

## Import Behavior

The importer is an explicit offline API script and uses the existing script
Prisma adapter. It has a dedicated package command and is never invoked by
application startup, build, migration, seed, or CI.

The importer performs these stages:

1. Load and structurally validate the complete JSON pack.
2. Load the canonical Topic slugs and produce the editorial vocabulary audit.
3. Resolve every referenced Topic in PostgreSQL.
4. Abort before content writes if any database Topic is missing.
5. Synchronize the full pack in one transaction.
6. Print a bounded summary containing created, updated, and skipped slugs.

Synchronization is keyed by immutable passage slug:

- a missing slug creates a complete aggregate with `DRAFT` status;
- an existing `DRAFT` replaces editable fields, questions, and options from
  the canonical JSON;
- an existing `PUBLISHED` aggregate is skipped and remains unchanged.

The importer derives one-based question and option order from their arrays. It
maps `topicSlug` to `topic_id`, preserves the JSON's correctness flags, and
reuses the existing Reading aggregate validation before persistence where
practical. It does not create Topics, publish passages, write Reading attempts,
or update Practice/Vocabulary progress.

Running the importer repeatedly against unchanged draft content produces no
duplicate passages. Draft synchronization may replace nested questions and
options because no learner can submit an unpublished passage. Published
content requires an explicit Admin unpublish and subsequent import before it
can be synchronized.

## Transactions and Failure Handling

All database checks required for content ownership complete before the write
transaction. The twelve passage synchronizations execute in one transaction so
an unexpected write failure cannot leave a partially imported pack.

Failures use a non-zero process exit and a concise actionable message. Logs may
include dataset paths, validation locations, Topic slugs, passage slugs, and
summary counts. They must not include database credentials or environment
secrets.

The script does not run or apply the Reading migration. Applying migrations and
choosing a database environment remain separate operating actions requiring
explicit user authorization.

## Testing

Pure dataset tests prove:

- the JSON satisfies the strict schema;
- all twelve expected slugs and canonical Topic associations exist;
- every passage has the agreed word, question, option, and correctness counts;
- normalized prompts and options are unique;
- the editorial vocabulary audit is deterministic and provider-independent.

Importer behavior tests use a controlled persistence seam and prove:

- missing passages are created as drafts;
- repeated import updates drafts without creating duplicates;
- published passages are skipped without mutation;
- missing database Topics cause zero content writes;
- ordering is derived consistently from arrays;
- created, updated, and skipped reporting is accurate;
- a write failure rolls back the complete pack.

The implementation must pass Shared/API/Admin/Web architecture and tests,
workspace type-check, lint, production build, formatting checks, and the
existing offline vocabulary tests. A real Admin-to-Learner smoke test is run
only after explicit authorization to apply the migration and import drafts into
a named database environment.

## Delivery and Review

The importer leaves every newly created passage in `DRAFT`. An administrator
reviews the text, questions, answers, and Topic in `/reading-passages`, then
publishes passages individually. No content becomes learner-visible as a side
effect of dataset validation or import.

The next content phase can add A2 only after the A1 pack has been imported,
reviewed, and exercised through the learner result flow. Vocabulary
highlighting, inline dictionary lookup, aggregate Reading analytics, and A2-B2
content remain separate features.
