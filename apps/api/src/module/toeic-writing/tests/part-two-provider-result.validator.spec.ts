import assert from "node:assert/strict";
import test from "node:test";

import { WritingAiInvalidResponseError } from "../provider/gemini-writing.provider";
import type { WritingPartTwoProviderResult } from "../provider/writing-ai-provider";
import { validatePartTwoProviderResult } from "../grading/part-two-provider-result.validator";

const responseText =
  "Dear Mr. Brown, 🙂 thank you for contacting us about the printer. Please tell us the model number so we can arrange an inspection. The issue may come from unsuitable paper, and warranty service remains available. We look forward to your reply and will help as soon as possible. Best regards, Customer Support";
const improvedEmail = `${responseText} Thank you again for your patience.`;

function evidence(text: string, source = responseText) {
  const sourcePoints = Array.from(source);
  const textPoints = Array.from(text);
  const start = sourcePoints.findIndex(
    (_point, index) =>
      sourcePoints.slice(index, index + textPoints.length).join("") === text
  );
  return { start, end: start + textPoints.length, text };
}

function validResult(): WritingPartTwoProviderResult {
  const greeting = evidence("Dear Mr. Brown");
  const question = evidence("Please tell us the model number");
  return {
    score: 4,
    scoreLabel: "Excellent",
    taskCompletion: {
      status: "PASS",
      completedCount: 2,
      totalCount: 2,
      requirements: [
        {
          requirementId: "requirement-1",
          status: "MET",
          comment: "The cause is explained.",
          evidence: [evidence("unsuitable paper")],
          suggestedFix: null,
        },
        {
          requirementId: "requirement-2",
          status: "MET",
          comment: "A question is included.",
          evidence: [question],
          suggestedFix: null,
        },
      ],
    },
    sentenceVariety: {
      status: "PASS",
      detected: [{ kind: "COMPLEX", evidence: question }],
      feedback: "The response uses varied sentences.",
    },
    tone: {
      status: "PASS",
      feedback: "The tone is professional.",
      suggestedOpening: null,
    },
    grammar: {
      status: "PASS",
      errors: [],
      feedback: "The response is accurate.",
    },
    paraphrase: {
      status: "PASS",
      copiedRanges: [greeting],
      feedback: "The response is sufficiently original.",
    },
    overallFeedback: "All tasks are completed clearly.",
    strengths: ["Professional tone"],
    improvements: ["Use one more complex sentence"],
    improvedEmail: {
      text: improvedEmail,
      wordCount: improvedEmail.trim().split(/\s+/u).length,
      differences: ["Added a courteous closing sentence."],
      requirementCoverage: [
        {
          requirementId: "requirement-1",
          evidence: [evidence("unsuitable paper", improvedEmail)],
        },
        {
          requirementId: "requirement-2",
          evidence: [
            evidence("Please tell us the model number", improvedEmail),
          ],
        },
      ],
    },
  };
}

const context = {
  responseText,
  requirementIds: ["requirement-1", "requirement-2"],
};

test("accepts exact Unicode evidence and complete requirement coverage", () => {
  const result = validResult();
  result.tone.feedback = "Cảm ơn bạn đã viết email rõ ràng.";

  assert.deepEqual(validatePartTwoProviderResult(result, context), result);
});

test("rejects out-of-range or mismatched learner evidence", () => {
  const outOfRange = validResult();
  outOfRange.taskCompletion.requirements[0]!.evidence[0]!.end = 9_999;
  const mismatched = validResult();
  mismatched.sentenceVariety.detected[0]!.evidence.text = "different";

  assert.throws(
    () => validatePartTwoProviderResult(outOfRange, context),
    WritingAiInvalidResponseError
  );
  assert.throws(
    () => validatePartTwoProviderResult(mismatched, context),
    WritingAiInvalidResponseError
  );
});

test("rejects missing, duplicate, and unknown requirement IDs", () => {
  for (const mutate of [
    (result: WritingPartTwoProviderResult) =>
      result.taskCompletion.requirements.pop(),
    (result: WritingPartTwoProviderResult) => {
      result.taskCompletion.requirements[1]!.requirementId = "requirement-1";
    },
    (result: WritingPartTwoProviderResult) => {
      result.taskCompletion.requirements[1]!.requirementId = "unknown";
    },
  ]) {
    const result = validResult();
    mutate(result);
    assert.throws(
      () => validatePartTwoProviderResult(result, context),
      WritingAiInvalidResponseError
    );
  }
});

test("rejects an improved email outside 50-300 words", () => {
  for (const count of [49, 301]) {
    const result = validResult();
    result.improvedEmail.text = Array.from(
      { length: count },
      (_, index) => `w${index % 10}`
    ).join(" ");
    result.improvedEmail.wordCount = count;
    result.improvedEmail.requirementCoverage = [];
    assert.throws(
      () => validatePartTwoProviderResult(result, context),
      WritingAiInvalidResponseError
    );
  }
});

test("rejects missing or mismatched improved-email coverage", () => {
  const missing = validResult();
  missing.improvedEmail.requirementCoverage.pop();
  const mismatched = validResult();
  mismatched.improvedEmail.requirementCoverage[0]!.evidence[0]!.text =
    "wrong text";

  assert.throws(
    () => validatePartTwoProviderResult(missing, context),
    WritingAiInvalidResponseError
  );
  assert.throws(
    () => validatePartTwoProviderResult(mismatched, context),
    WritingAiInvalidResponseError
  );
});
