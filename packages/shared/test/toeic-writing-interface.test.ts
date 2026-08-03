import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  getToeicWritingResponseLength,
  TOEIC_WRITING_RESPONSE_LIMITS,
  TOEIC_WRITING_WORD_LIMITS,
  type ToeicWritingPartOneGradeRequest,
  type ToeicWritingPartOneGradeResult,
  type ToeicWritingDraftPayload,
  type ToeicWritingSubmissionPayload,
  type ToeicWritingTaskDetail,
} from "@repo/shared";

const sharedRoot = join(import.meta.dirname, "..");

test("Shared publishes the TOEIC Writing learner interface from its root", () => {
  const detail: ToeicWritingTaskDetail = {
    id: 1,
    part: 1,
    order: 1,
    title: "Describe the picture",
    difficulty: "EASY",
    contentVersion: "writing-v1",
    submitted: false,
    hasDraft: false,
    exercise: {
      imageUrl: "/api/toeic-writing/tasks/1/image",
      instructionsEn: "Write one sentence about the picture.",
      instructionsVi: "Viết một câu về bức tranh.",
      requiredWords: [
        {
          en: "woman",
          vi: "người phụ nữ",
        },
      ],
    },
  };
  const draft: ToeicWritingDraftPayload = {
    contentVersion: detail.contentVersion,
    responseText: "A woman is writing in a notebook.",
  };
  const submission: ToeicWritingSubmissionPayload = {
    ...draft,
    submissionKey: "00000000-0000-4000-8000-000000000001",
  };

  assert.equal(detail.part, 1);
  assert.equal(detail.exercise.requiredWords[0]?.en, "woman");
  assert.equal(draft.contentVersion, "writing-v1");
  assert.equal(
    submission.submissionKey,
    "00000000-0000-4000-8000-000000000001"
  );
  assert.doesNotMatch(JSON.stringify(detail), /sample|outline|chunk|idea/iu);

  const writingTypes = readFileSync(
    join(sharedRoot, "src/types/toeic-writing.ts"),
    "utf8"
  );
  const typeIndex = readFileSync(
    join(sharedRoot, "src/types/index.ts"),
    "utf8"
  );

  assert.match(typeIndex, /export \* from "\.\/toeic-writing\.js"/u);
  assert.match(writingTypes, /export type ToeicWritingTaskDetail =/u);
  assert.match(writingTypes, /export type ToeicWritingDraftPayload =/u);
  assert.match(writingTypes, /export type ToeicWritingSubmissionResult =/u);
  assert.doesNotMatch(writingTypes, /@prisma|@nestjs|react/iu);
});

test("Writing response length trims whitespace and counts Unicode code points", () => {
  assert.equal(getToeicWritingResponseLength("  A😀B  "), 3);
  assert.equal(getToeicWritingResponseLength(" \n\t "), 0);
});

test("Writing publishes official Part response limits and AI grading contracts", () => {
  assert.deepEqual(TOEIC_WRITING_RESPONSE_LIMITS, { 1: 300, 2: 2_200 });
  assert.deepEqual(TOEIC_WRITING_WORD_LIMITS, {
    1: { min: 3, max: 40 },
    2: { min: 50, max: 300 },
  });

  const request: ToeicWritingPartOneGradeRequest = {
    contentVersion: "a".repeat(64),
    responseText: "The woman is preparing food.",
    idempotencyKey: "00000000-0000-4000-8000-000000000001",
    locale: "vi",
  };
  const result: ToeicWritingPartOneGradeResult = {
    id: 1,
    taskId: 12,
    score: 3,
    scoreLabel: "Xuất sắc",
    checks: {
      grammar: { status: "PASS", label: "Grammar", feedback: "Correct." },
      keywords: { status: "PASS", label: "Keywords", feedback: "Complete." },
      relevance: { status: "PASS", label: "Relevance", feedback: "Relevant." },
    },
    overallFeedback: "A complete response.",
    suggestion: {
      correctedSentence: "The woman is preparing food.",
      annotated: [{ text: "The woman is preparing food.", status: "KEPT" }],
      alternativeSentence: "A woman is preparing a meal.",
      explanation: "The sentence is already correct.",
    },
    quota: {
      dailyLimit: 5,
      used: 1,
      remaining: 4,
      resetAt: "2026-08-04T00:00:00.000Z",
    },
    cached: false,
    assistance: {
      outlineViewed: false,
      vocabularyViewed: false,
      sampleViewed: false,
      communityAnswerRestored: false,
    },
  };

  assert.equal(request.locale, "vi");
  assert.equal(result.score, 3);
  assert.equal(result.quota.remaining, 4);
});
