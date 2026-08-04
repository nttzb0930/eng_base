# CEFR Level Progress Design

## Goal

Replace fabricated CEFR counts, percentages, levels, and unlock state on the Learner Learn screens with one backend-owned A1–B2 progress summary. Persist the Course Unit to CEFR relationship so runtime behavior never infers a level from a title or display order.

## Scope

This vertical slice covers:

- a durable nullable CEFR field on Course Unit;
- migration backfill for the existing `english-vocabulary` course;
- Admin create/update support for the field;
- an authenticated CEFR progress endpoint;
- Learn and Learn Level presentation backed by real data;
- bilingual presentation copy touched by the change.

It does not add C1/C2 content, modify vocabulary records, redesign review scheduling, or implement Topic Practice.

## Persistence

Add `cefr_level String?` to the Prisma `units` model. The SQL migration will:

1. add `units.cefr_level` as nullable `VARCHAR(2)`;
2. backfill the four existing Units owned by the Course whose immutable code is `english-vocabulary`, mapping Unit order 1–4 to A1, A2, B1, and B2;
3. fail the migration if an existing Unit in that Course remains unmapped, preventing silent partial ownership;
4. add a check constraint accepting only A1, A2, B1, B2, or `NULL`;
5. add an index on `(course_id, cefr_level)`.

The column remains nullable because other Courses may not use CEFR. It is not unique because a future Course may contain multiple Units for one level.

The migration file and Prisma schema are committed, but the migration is not applied to a database during implementation or verification. Prisma Client generation is allowed because it changes generated client code only.

## Shared contracts

`CourseUnit` gains:

```ts
cefrLevel: CefrLevel | null;
```

Create and update payloads carry the same nullable field. The root Shared Interface also exposes:

```ts
type CefrLevelProgress = {
  level: CefrLevel;
  totalWords: number;
  learnedWords: number;
  masteredWords: number;
  completedLessons: number;
  totalLessons: number;
  unlocked: boolean;
};

type CefrProgressSummary = {
  totalWords: number;
  levels: CefrLevelProgress[];
};
```

The response contains exactly A1, A2, B1, and B2 in that order, including zero-valued levels.

## Admin Course Unit management

Course Unit persistence and wire mappers read and write `cefr_level` as `cefrLevel`. Nest DTO validation accepts A1–B2 or `null`; unsupported strings return the existing validation error response.

The Admin Unit form adds an optional CEFR selector with `None`, A1, A2, B1, and B2. Editing a Unit restores its persisted value. Create/update requests send `null` for `None`, so administrators can explicitly remove an assignment.

## Backend progress capability

Add `GET /progress/cefr-levels` behind the existing Learner guard. A focused goal use case composes data for the authenticated Learner:

- vocabulary totals grouped by `vocabulary_items.cefr_level`;
- learned and mastered totals grouped through `user_vocabulary_progress`;
- active Course Units selected by persisted `units.cefr_level`;
- lesson completion determined by persisted challenge progress;
- the confirmed placement level from `placement_test_sessions.confirmed_level`.

`learnedWords` counts vocabulary progress rows. `masteredWords` counts rows whose `mastery_level` is `mastered`, matching the Dashboard definition. A lesson is complete only when it has at least one challenge and every challenge has completed progress for the Learner.

Unlock policy is evaluated in A1–B2 order:

1. A1 is always unlocked.
2. The confirmed placement level and every lower level are unlocked.
3. Any next level is unlocked when the immediately preceding level has at least one vocabulary item and `masteredWords / totalWords >= 0.8`.

Placement and mastery are independent unlock reasons. An empty previous level never unlocks the next level through percentage arithmetic.

The use case performs grouped/aggregated queries rather than loading the complete vocabulary catalog into application memory.

## Learner Web

The Progress feature adds a resource method, query key, and hook for the new endpoint.

`LearnLevelView` renders only the four summaries returned by the API. It removes C1/C2, fabricated catalog totals, lesson-derived vocabulary counts, default percentages, and client-owned unlock calculation. Unit selection uses `unit.cefrLevel`, not title parsing. Locked cards do not navigate.

`LearnView` combines the new summary with the existing Dashboard response:

- mastered words and accuracy come from Dashboard;
- due words come from Dashboard;
- remaining/unlocked lesson and level counts come from the CEFR summary;
- unsupported fabricated metrics such as a fake streak or active-mode count are replaced by metrics with real sources.

Loading waits for all required queries. A failed CEFR or Dashboard query shows the existing page-level error/empty treatment and never substitutes sample numbers.

Touched labels, descriptions, lock explanations, and actions live under matching `en.json` and `vi.json` keys. Domain values such as Unit titles remain API content and are not duplicated into message catalogs.

## Error handling

- A Learner without an active Course receives a zero-valued A1–B2 summary; this endpoint does not create progress or select a Course.
- Units with `cefr_level = NULL` are omitted from CEFR lesson totals.
- Unsupported persisted CEFR values are prevented by the database constraint and DTO validation.
- Query failures propagate through the existing API error envelope and React Query error state.

## Testing

- Migration architecture test checks the column, backfill, validation guard, constraint, and index without applying the migration.
- Mapper and DTO tests cover `cefrLevel`, including explicit `null` updates.
- Use-case tests cover empty data, aggregation, 80% boundary, below-boundary locking, placement override, zero-vocabulary behavior, and lesson completion.
- Controller test protects `GET /progress/cefr-levels` and authenticated user forwarding.
- Web resource tests protect the endpoint and response shape.
- View/architecture tests prohibit C1/C2 and the known fabricated CEFR values in Learn views.
- Message-catalog tests keep English and Vietnamese keys aligned.
- Full Shared, API, Web, Admin, repository architecture, type, lint, test, and build gates run before handoff.

## Operational safety

Implementation may run `prisma generate`, tests, type checks, lint, and builds. It must not run `prisma migrate`, `db:push`, `db:seed`, reset commands, vocabulary mutation scripts, or provider calls.
