import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException } from "@nestjs/common";
import { SubmitToeicListeningAttemptUseCase } from "../use-cases/submit-toeic-listening-attempt.use-case";

const payload = {
  submissionKey: "00000000-0000-4000-8000-000000000001",
  testId: 9,
  listeningSourceVersion: "a".repeat(64),
  practicePart: 1 as const,
  answers: [{ questionId: 11, optionId: 111 }],
};
const testRow = {
  id: 9,
  title: "Test 1",
  listening_source_version: "a".repeat(64),
  toeic_questions: [
    {
      id: 11,
      number: 1,
      part: 1,
      prompt: "",
      transcript: "Photo",
      transcript_translation: null,
      explanation: null,
      toeic_stimuli: null,
      toeic_media_bindings: [],
      toeic_question_options: [
        { id: 111, label: "A", text: "", correct: true },
        { id: 112, label: "B", text: "", correct: false },
      ],
    },
  ],
};

test("submission reads server answer keys and atomically stores snapshots", async () => {
  let created:
    | {
        correct_count: number;
        toeic_listening_attempt_answers: {
          create: Array<{ transcript_snapshot: string | null }>;
        };
      }
    | undefined;
  const stored = {
    id: 4,
    test_id: 9,
    practice_part: 1,
    submission_fingerprint: "ignored",
    listening_source_version_snapshot: "a".repeat(64),
    test_title_snapshot: "Test 1",
    correct_count: 1,
    total_count: 1,
    accuracy: 100,
    submitted_at: new Date(),
    toeic_listening_attempt_answers: [],
  };
  const transaction = {
    toeic_listening_attempts: {
      create: (query: { data: NonNullable<typeof created> }) => {
        created = query.data;
        return Promise.resolve(stored);
      },
    },
    toeic_listening_drafts: { deleteMany: () => Promise.resolve({ count: 1 }) },
  };
  const prisma = {
    toeic_listening_attempts: { findUnique: () => Promise.resolve(null) },
    toeic_tests: { findFirst: () => Promise.resolve(testRow) },
    toeic_listening_drafts: { deleteMany: () => Promise.resolve({ count: 0 }) },
    $transaction: (run: (value: typeof transaction) => unknown) =>
      run(transaction),
  };
  await new SubmitToeicListeningAttemptUseCase(prisma as never).execute(
    "user-1",
    payload
  );
  assert.ok(created);
  assert.equal(created.correct_count, 1);
  assert.equal(
    created.toeic_listening_attempt_answers.create[0].transcript_snapshot,
    "Photo"
  );
});

test("submission rejects a stale Listening version", async () => {
  const prisma = {
    toeic_listening_attempts: { findUnique: () => Promise.resolve(null) },
    toeic_tests: {
      findFirst: () =>
        Promise.resolve({
          ...testRow,
          listening_source_version: "b".repeat(64),
        }),
    },
    toeic_listening_drafts: { deleteMany: () => Promise.resolve({ count: 0 }) },
  };
  await assert.rejects(
    () =>
      new SubmitToeicListeningAttemptUseCase(prisma as never).execute(
        "user-1",
        payload
      ),
    ConflictException
  );
});
