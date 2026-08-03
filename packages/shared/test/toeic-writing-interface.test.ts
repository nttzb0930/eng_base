import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  getToeicWritingResponseLength,
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
    "00000000-0000-4000-8000-000000000001",
  );
  assert.doesNotMatch(JSON.stringify(detail), /sample|outline|chunk|idea/iu);

  const writingTypes = readFileSync(
    join(sharedRoot, "src/types/toeic-writing.ts"),
    "utf8",
  );
  const typeIndex = readFileSync(
    join(sharedRoot, "src/types/index.ts"),
    "utf8",
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
