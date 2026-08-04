import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException, NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { createReadingSubmissionFingerprint } from "../use-cases/reading-grading.policy";
import { SubmitReadingAttemptUseCase } from "../use-cases/submit-reading-attempt.use-case";

const submission = {
  submissionKey: "00000000-0000-4000-8000-000000000001",
  answers: [{ questionId: 10, optionId: 101 }],
};

const passage = {
  id: 1,
  title: "A Day in Hanoi",
  reading_questions: [
    {
      id: 10,
      prompt: "Where does Mia live?",
      order: 1,
      reading_options: [
        { id: 101, text: "In Hanoi", order: 1, correct: true },
        { id: 102, text: "In London", order: 2, correct: false },
      ],
    },
  ],
};

const storedAttempt = {
  id: 20,
  user_id: "learner-1",
  passage_id: 1,
  submission_key: submission.submissionKey,
  submission_fingerprint: "",
  passage_title_snapshot: passage.title,
  correct_count: 1,
  total_count: 1,
  accuracy: 100,
  submitted_at: new Date("2026-07-30T00:00:00.000Z"),
  reading_attempt_answers: [
    {
      question_id_snapshot: 10,
      question_prompt_snapshot: passage.reading_questions[0]!.prompt,
      selected_option_text_snapshot: "In Hanoi",
      correct_option_text_snapshot: "In Hanoi",
      correct: true,
    },
  ],
};

test("grades and creates an attempt plus immutable snapshots in one transaction", async () => {
  const creates: unknown[] = [];
  const transaction = {
    reading_attempts: {
      create: (args: unknown) => {
        creates.push(args);
        return Promise.resolve(storedAttempt);
      },
    },
  };
  const prisma = {
    reading_attempts: {
      findUnique: () => Promise.resolve(null),
    },
    reading_passages: {
      findFirst: () => Promise.resolve(passage),
    },
    $transaction: (
      callback: (value: typeof transaction) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as PrismaService;

  const result = await new SubmitReadingAttemptUseCase(prisma).execute(
    "learner-1",
    1,
    submission,
  );

  assert.equal(result.accuracy, 100);
  const data = (
    creates[0] as {
      data: {
        user_id: string;
        reading_attempt_answers: {
          create: Array<Record<string, unknown>>;
        };
      };
    }
  ).data;
  assert.equal(data.user_id, "learner-1");
  assert.deepEqual(data.reading_attempt_answers.create[0], {
    question_id_snapshot: 10,
    selected_option_id_snapshot: 101,
    question_prompt_snapshot: "Where does Mia live?",
    selected_option_text_snapshot: "In Hanoi",
    correct_option_text_snapshot: "In Hanoi",
    correct: true,
  });
  assert.equal("practice_sessions" in (prisma as object), false);
  assert.equal("user_vocabulary_progress" in (prisma as object), false);
});

test("returns the original result for the same learner key and payload", async () => {
  let passageReads = 0;
  const firstPrisma = {
    reading_attempts: { findUnique: () => Promise.resolve(null) },
    reading_passages: { findFirst: () => Promise.resolve(passage) },
    $transaction: (callback: (value: unknown) => Promise<unknown>) =>
      callback({
        reading_attempts: {
          create: () => Promise.resolve(storedAttempt),
        },
      }),
  } as unknown as PrismaService;
  await new SubmitReadingAttemptUseCase(firstPrisma).execute(
    "learner-1",
    1,
    submission,
  );

  const persisted = {
    ...storedAttempt,
    submission_fingerprint: createReadingSubmissionFingerprint(
      1,
      submission.answers,
    ),
  };
  const retryPrisma = {
    reading_attempts: { findUnique: () => Promise.resolve(persisted) },
    reading_passages: {
      findFirst: () => {
        passageReads += 1;
        return Promise.resolve(passage);
      },
    },
  } as unknown as PrismaService;

  const result = await new SubmitReadingAttemptUseCase(retryPrisma).execute(
    "learner-1",
    1,
    submission,
  );
  assert.equal(result.id, 20);
  assert.equal(passageReads, 0);
});

test("rejects key reuse with different content", async () => {
  const prisma = {
    reading_attempts: {
      findUnique: () =>
        Promise.resolve({
          ...storedAttempt,
          submission_fingerprint: "different",
        }),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      new SubmitReadingAttemptUseCase(prisma).execute(
        "learner-1",
        1,
        submission,
      ),
    ConflictException,
  );
});

test("rejects submission to an unavailable passage", async () => {
  const prisma = {
    reading_attempts: { findUnique: () => Promise.resolve(null) },
    reading_passages: { findFirst: () => Promise.resolve(null) },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      new SubmitReadingAttemptUseCase(prisma).execute(
        "learner-1",
        1,
        submission,
      ),
    NotFoundException,
  );
});
