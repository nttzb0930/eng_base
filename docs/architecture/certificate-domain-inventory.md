# Certificate Domain Inventory

## Purpose

This inventory defines the first-release behavior for IELTS, TOEIC, TOEFL,
and VSTEP learning before English Base exposes Certificate APIs or progress.
It records product requirements separately from the current illustrative UI.

The accepted Course Content hierarchy remains:

```text
Course -> Unit -> Lesson -> Lesson challenge -> Challenge option
```

Course `code` is the immutable business identity. Course `title` is editable
presentation content and cannot identify a Certificate experience.

## First-release behavior

| Experience     | Own lessons?                                      | Own vocabulary membership?                                                                   | Enrollment?                                                | Independent progress?                                                     | Admin authoring?                                     | Required launch behavior                                                                                     |
| -------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| IELTS Academic | Required for first release through Course Content | Excluded from first release; vocabulary coverage is derived from lesson challenge references | Excluded from first release; reuse active Course selection | Excluded from first release; reuse Course, lesson, and challenge progress | Required for first release through Course Management | Render only a real Course with immutable code `ielts-academic`; otherwise show a localized unavailable state |
| TOEIC 600+     | Required for first release through Course Content | Excluded from first release; vocabulary coverage is derived from lesson challenge references | Excluded from first release; reuse active Course selection | Excluded from first release; reuse Course, lesson, and challenge progress | Required for first release through Course Management | Render only a real Course with immutable code `toeic-600`; otherwise show a localized unavailable state      |
| TOEFL iBT      | Required for first release through Course Content | Excluded from first release; vocabulary coverage is derived from lesson challenge references | Excluded from first release; reuse active Course selection | Excluded from first release; reuse Course, lesson, and challenge progress | Required for first release through Course Management | Render only a real Course with immutable code `toefl-ibt`; otherwise show a localized unavailable state      |
| VSTEP B1       | Required for first release through Course Content | Excluded from first release; vocabulary coverage is derived from lesson challenge references | Excluded from first release; reuse active Course selection | Excluded from first release; reuse Course, lesson, and challenge progress | Required for first release through Course Management | Render only a real Course with immutable code `vstep-b1`; otherwise show a localized unavailable state       |

The repository currently seeds only the `english-vocabulary` Course. Therefore
none of the four Certificate experiences is available from current repository
data. A title match, array position, Topic membership, or static learner metric
must not make one appear available.

## Current fictional presentation

None of the following values or relationships is an accepted domain contract.

| Source                                                              | Fictional presentation                                                                                            |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `apps/web/app/views/courses/CoursesView.tsx`                        | Certificate tab count `4`; summary totals `4` total, `1` active, and `3` locked                                   |
| `apps/web/app/views/courses/CoursesView.tsx`                        | The first arbitrary Course is presented as IELTS Academic                                                         |
| `apps/web/app/views/courses/CoursesView.tsx`                        | IELTS progress `42%`, `428/1,247` words, and a fixed recent-learning timestamp                                    |
| `apps/web/app/views/courses/CoursesView.tsx`                        | TOEIC is locked behind IELTS with `0/980` words                                                                   |
| `apps/web/app/views/courses/CoursesView.tsx`                        | TOEFL is locked behind IELTS with `0/1,100` words                                                                 |
| `apps/web/app/views/courses/CoursesView.tsx`                        | VSTEP is locked behind TOEIC with `0/820` words                                                                   |
| `apps/web/app/features/topics/components/DiscoveryTabs.tsx`         | Certificate count defaults to `4` when no owning response supplies a count                                        |
| `apps/web/app/views/topics/TopicDetailView.tsx`                     | IELTS distribution contains `42` words, `32` learned, and a fixed progress ring                                   |
| `apps/web/app/views/topics/TopicDetailView.tsx`                     | TOEIC distribution contains `28` words, `18` learned, and a fixed progress ring                                   |
| `apps/web/app/views/topics/TopicDetailView.tsx`                     | B1/TOEFL distribution contains `17` words, `6` learned, and a fixed progress ring                                 |
| `apps/web/app/views/topics/TopicDetailView.tsx`                     | Vocabulary rows display IELTS and TOEIC membership labels without a Certificate ownership contract                |
| `apps/web/app/messages/en.json` and `apps/web/app/messages/vi.json` | Flashcard descriptions claim Certificate decks are selectable even though the real summary contract excludes them |

The localized `/learn/cert` route may remain as the Certificate discovery
entry point, but it must show only real Certificate Courses or a truthful
unavailable state. Flashcards and Topics must not infer Certificate membership
or progress.

## Launch boundary

The first Certificate launch requires all of the following:

1. An Admin-authored Course exists with one of the immutable codes above.
2. Its ordered Units, Lessons, challenges, and options are owned by Courses.
3. Learner progress comes from the existing Course learning flow.
4. Vocabulary coverage is derived from vocabulary references in Course
   challenges; it is not a separate Certificate taxonomy.

Enrollment, Certificate-specific progress tables, vocabulary membership tables,
and unlock dependencies between exam brands are excluded from the first
release. Adding any of them requires a separate accepted design and migration
plan.
