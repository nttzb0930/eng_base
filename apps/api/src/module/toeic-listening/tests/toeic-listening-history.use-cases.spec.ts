import assert from "node:assert/strict";
import test from "node:test";
import { GetToeicListeningAttemptUseCase } from "../use-cases/get-toeic-listening-attempt.use-case";
import { ListToeicListeningAttemptsUseCase } from "../use-cases/list-toeic-listening-attempts.use-case";

const stored = {
  id: 4,
  test_id: 9,
  practice_part: 1,
  submission_fingerprint: "f",
  listening_source_version_snapshot: "a".repeat(64),
  test_title_snapshot: "Test 1",
  correct_count: 1,
  total_count: 1,
  accuracy: 100,
  submitted_at: new Date("2026-08-01T00:00:00Z"),
  toeic_listening_attempt_answers: [
    {
      question_id_snapshot: 11,
      question_number_snapshot: 1,
      part_snapshot: 1,
      question_prompt_snapshot: "",
      transcript_snapshot: "A person is walking.",
      transcript_translation_snapshot: null,
      question_media_snapshot: { audioMediaId: 801, imageMediaIds: [802] },
      stimulus_snapshot: null,
      selected_option_label_snapshot: "A",
      selected_option_text_snapshot: "",
      correct_option_label_snapshot: "A",
      correct_option_text_snapshot: "",
      explanation_snapshot: "Photo clue",
      correct: true,
    },
  ],
};

test("history is isolated by account and optional Part", async () => {
  let query: { where: unknown } | undefined;
  const prisma = {
    toeic_listening_attempts: {
      findMany: (value: { where: unknown }) => {
        query = value;
        return Promise.resolve([stored]);
      },
    },
  };
  const result = await new ListToeicListeningAttemptsUseCase(
    prisma as never
  ).execute("user-1", 1);
  assert.ok(query);
  assert.deepEqual(query.where, { user_id: "user-1", practice_part: 1 });
  assert.equal(result[0]!.testTitle, "Test 1");
});

test("result reads immutable snapshots for its account", async () => {
  let where: unknown;
  const prisma = {
    toeic_listening_attempts: {
      findFirst: (query: { where: unknown }) => {
        where = query.where;
        return Promise.resolve(stored);
      },
    },
  };
  const result = await new GetToeicListeningAttemptUseCase(
    prisma as never
  ).execute("user-1", 4);
  assert.deepEqual(where, { id: 4, user_id: "user-1" });
  assert.equal(result.answers[0]!.transcript, "A person is walking.");
});
