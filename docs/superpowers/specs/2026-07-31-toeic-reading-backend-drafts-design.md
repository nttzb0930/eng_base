# TOEIC Reading Backend Drafts Design

## Goal

Persist in-progress TOEIC Reading work securely under the authenticated
Learner's account. Test cards show truthful answered progress, and reopening a
test restores the active question, selected options, and review markers.

## Scope

- Support Full Test, Part 5, Part 6, and Part 7 independently.
- Persist drafts in PostgreSQL through authenticated API endpoints.
- Autosave after every answer selection, review toggle, or active-question
  change.
- Surface draft progress in test discovery cards.
- Restore a valid draft when entering its matching session.
- Delete the matching draft after successful submission.
- Do not change grading, attempt snapshots, or published TOEIC content.

## Persistence

Add `toeic_reading_drafts` with:

- `id`
- `user_id`
- `test_id`
- `scope`, using `FULL`, `PART_5`, `PART_6`, or `PART_7`
- `source_version`
- `active_question_id`
- `answers` as a JSON array of `{ questionId, optionId }`
- `review_question_ids` as an integer array
- `created_at`
- `updated_at`
- `expires_at`

`(user_id, test_id, scope)` is unique. User and Test deletes cascade to the
draft. Draft rows contain selected identifiers only; they do not copy question
content, correctness, authentication credentials, or personal profile data.

Drafts expire 30 days after their latest save. Reads ignore expired rows and
delete the matching expired row. A save refreshes `expires_at`.

## Authorization and Validation

The controller obtains `userId` exclusively from `CurrentUserId`; request
payloads never accept it.

Before upsert, the API verifies:

- the Test exists and is `PUBLISHED`;
- the submitted `sourceVersion` equals the current version;
- every question belongs to the Test and selected scope;
- every selected option belongs to its submitted question;
- answer question IDs are unique;
- the active question belongs to the selected scope;
- every review marker belongs to the selected scope and is unique.

Invalid ownership, scope, or version fails closed without changing the existing
draft.

## API

- `GET /toeic/reading/tests/:testId/draft?part=5|6|7`
  - Returns the authenticated Learner's non-expired matching draft or `null`.
- `PUT /toeic/reading/tests/:testId/draft`
  - Accepts `sourceVersion`, optional `practicePart`, `activeQuestionId`,
    `answers`, and `reviewQuestionIds`.
  - Validates and atomically upserts the snapshot.
- `DELETE /toeic/reading/tests/:testId/draft?part=5|6|7`
  - Deletes only the authenticated Learner's matching draft.

Test list summaries include:

```ts
draftProgress: {
  answeredCount: number;
  totalCount: number;
  activeQuestionId: number;
  updatedAt: string;
} | null;
```

Full and Part list queries select only the matching draft scope.

## Submission

A successful new submission deletes the matching draft inside the attempt
transaction. An idempotent retry that returns an existing successful attempt
also leaves no matching draft. A failed or version-conflicted submission
preserves the draft.

## Web Behavior

The TOEIC Reading feature owns draft resource methods, query keys, and hooks.
The session loads Test detail and draft in parallel. A valid draft initializes
the existing session state once; local interaction remains responsive while
each state transition triggers an immediate upsert mutation.

Autosave errors do not discard local state. The session displays a localized
save-status error and retries on the next state change. Navigating before the
first draft query resolves cannot overwrite a stored draft with empty state.
Client saves for one Test and scope are serialized so an older network response
cannot overwrite a newer snapshot. Rapid changes may collapse queued work into
the latest complete snapshot because every snapshot contains the full draft
state.

Test cards render:

- `answeredCount/totalCount`;
- a proportional progress bar;
- answered, remaining, and latest submitted score information where available;
- `Continue test` when a draft exists, otherwise `Start test`.

After submission succeeds, Web removes the draft query from cache and
invalidates all scoped test lists.

## Compatibility

- Existing attempts remain unchanged.
- Existing users begin with no draft.
- Existing test list consumers receive the new nullable field.
- No localStorage fallback is introduced.
- Drafts are device-independent because PostgreSQL is the source of truth.

## Verification

- Migration tests protect table, foreign keys, unique identity, indexes, and
  expiry columns.
- API use-case tests cover account isolation, scope isolation, ownership,
  version conflicts, expiry, idempotent upsert, and submission cleanup.
- Controller tests protect JWT-derived ownership and endpoint contracts.
- Web resource tests protect paths, payloads, query keys, restoration, autosave,
  cache cleanup, and card progress.
- Full API and Web architecture, test, typecheck, lint, format, and build gates
  must pass before handoff.
