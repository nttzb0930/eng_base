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
  type ToeicWritingPartTwoGradeRequest,
  type ToeicWritingPartTwoGradeResult,
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

  const partTwoRequest: ToeicWritingPartTwoGradeRequest = {
    contentVersion: "b".repeat(64),
    responseText: "Dear Mr. Brown, thank you for contacting us.",
    idempotencyKey: "00000000-0000-4000-8000-000000000002",
    locale: "en",
  };
  const evidence = { start: 0, end: 14, text: "Dear Mr. Brown" };
  const partTwoResult: ToeicWritingPartTwoGradeResult = {
    id: 2,
    taskId: 13,
    score: 4,
    scoreLabel: "Excellent",
    taskCompletion: {
      status: "PASS",
      completedCount: 1,
      totalCount: 1,
      requirements: [
        {
          requirementId: "requirement-1",
          status: "MET",
          comment: "Complete.",
          evidence: [evidence],
          suggestedFix: null,
        },
      ],
    },
    sentenceVariety: {
      status: "PASS",
      detected: [{ kind: "COMPLEX", evidence }],
      feedback: "Varied.",
    },
    tone: {
      status: "PASS",
      feedback: "Professional.",
      suggestedOpening: null,
    },
    grammar: { status: "PASS", errors: [], feedback: "Accurate." },
    paraphrase: { status: "PASS", copiedRanges: [], feedback: "Original." },
    overallFeedback: "A complete response.",
    strengths: ["Clear tone"],
    improvements: [],
    improvedEmail: {
      text: partTwoRequest.responseText,
      wordCount: 8,
      differences: [],
      requirementCoverage: [
        { requirementId: "requirement-1", evidence: [evidence] },
      ],
    },
    quota: result.quota,
    cached: false,
    assistance: result.assistance,
  };

  assert.equal(partTwoRequest.locale, "en");
  assert.equal(partTwoResult.score, 4);
  assert.equal(partTwoResult.taskCompletion.requirements[0]?.status, "MET");
});
