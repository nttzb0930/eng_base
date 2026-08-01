# TOEIC Grammar Lessons Design

## Goal

Extend the approved TOEIC Grammar snapshot and learner experience with the
lesson content attached to each Grammar subtopic. A learner opens one subtopic,
reads its lesson, then switches to the existing server-graded practice without
losing account progress.

## Scope

- Acquire only lesson rows visible to the configured source identity.
- Preserve source lesson identity, titles, content type, ordered Vietnamese and
  English theory text, and optional structured/HTML representations.
- Import lessons with the same checksum-approved snapshot as topics,
  subtopics, questions, sets, and difficulty memberships.
- Expose authenticated learner-safe subtopic detail.
- Add a localized detail route with `Bài học` and `Luyện tập` tabs.
- Reuse the existing subtopic practice endpoint and grading flow.

This phase does not invoke AI, generate missing lessons, publish source HTML
without sanitization, add Admin editing, or apply a migration automatically.

## Source and canonical data

The source `lessons` table links to `grammar_subtopics` through `subtopic_id`.
The inspected source record uses `content_type=plain_text` and stores its lesson
body in `theory_content_vi`. Other visible rows may use `theory_content_en`,
`lesson_content_json`, or `html_content`, so the source adapter preserves all
four forms while validation remains fail-closed.

The Grammar inventory includes lesson identifiers and a count per visible
subtopic. Download reads those approved lesson identities and produces a
schema-version-2 snapshot with a canonical `lessons` array. Every lesson must
reference an imported subtopic; source lesson and subtopic identities must be
unique. A lesson is valid when at least one supported content field is non-empty.

`plain_text` renders only theory text. Structured JSON remains data and is not
interpreted as executable markup. Raw HTML is stored for fidelity but the
learner API does not return it in this phase, preventing unsanitized injection.

## Persistence

Add `grammar_lessons` under the existing snapshot owner:

- `snapshot_id`, `subtopic_id`, `source`, and `source_lesson_id`;
- `title_en`, `title_vi`, and `content_type`;
- `theory_content_en`, `theory_content_vi`, and optional
  `lesson_content_json`;
- `order_index`.

The source/subtopic pair is unique. Snapshot replacement deletes and recreates
lesson rows in the same transaction as the rest of Grammar content, then marks
the new snapshot active last. Learner question progress remains untouched.

## Learner API

`GET /toeic/grammar/subtopics/:target`

The authenticated endpoint resolves only a subtopic from the active snapshot
and returns:

- snapshot version and stable topic/subtopic targets;
- localized titles and descriptions;
- ordered lesson blocks containing safe text or structured JSON;
- the existing question progress summary for that subtopic.

Unknown or inactive targets return 404. The response contains no question
answer key, correct option, explanation, or source HTML. Practice questions
continue to come from
`GET /toeic/grammar/practice?mode=subtopic&target=<target>` and submissions
continue through `POST /toeic/grammar/answers`.

## Web experience

The localized main-shell route is
`/learn/cert/toeic/reading/grammar/<subtopicId>`. Its page remains a thin server
component and renders a client view under `app/views/toeic-grammar`.

The view contains an ordered subtopic rail on wide screens and a compact
selector on small screens. The main panel has URL-backed `lesson` and
`practice` tabs. Lesson mode renders title, paragraphs, and structured sections
without `dangerouslySetInnerHTML`. Practice mode links into or embeds the
existing focused single-question session; grading and navigation state are not
reimplemented.

Catalog subtopic actions open the detail route. An aggregate topic action still
opens topic practice. Loading, empty, missing-lesson, and retry states receive a
Grammar-specific skeleton and English/Vietnamese messages with key parity.

## Error handling and safety

- Source credential normalization accepts raw JWT and `Bearer <JWT>` without
  producing a duplicated authorization prefix.
- Inventory/download fail on malformed lesson references or unapproved lesson
  identities.
- A missing optional English lesson does not hide valid Vietnamese content.
- The API does not fall back to the external source at request time.
- The UI never renders source HTML directly.
- Migration and snapshot import remain explicit operator actions.

## Testing

Implementation follows red-green-refactor. Pipeline tests cover source parsing,
token normalization, deterministic lesson hashing, reference validation, and
import replacement. API tests cover active-snapshot lookup, 404 behavior,
ordered safe lesson mapping, progress, and answer-key absence. Web tests cover
resource paths/query keys, route parsing, catalog navigation, localized tab
copy, safe block rendering, route thinness, and the reuse of subtopic practice.
