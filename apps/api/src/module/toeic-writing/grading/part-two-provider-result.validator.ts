import type { ToeicWritingEvidenceRange } from "@repo/shared";

import { WritingAiInvalidResponseError } from "../provider/gemini-writing.provider";
import { writingPartTwoProviderResultSchema } from "../provider/writing-ai.schemas";
import type { WritingPartTwoProviderResult } from "../provider/writing-ai-provider";
import { validatePartTwoResponse } from "../validation/part-two-response.validator";

type ValidationContext = {
  responseText: string;
  requirementIds: string[];
};

function invalid(reason: string): never {
  throw new WritingAiInvalidResponseError(reason);
}

function verifyEvidence(
  sourceText: string,
  evidence: ToeicWritingEvidenceRange
): void {
  const points = Array.from(sourceText);
  if (
    evidence.start < 0 ||
    evidence.end <= evidence.start ||
    evidence.end > points.length ||
    points.slice(evidence.start, evidence.end).join("") !== evidence.text
  ) {
    invalid(`evidence mismatch at [${evidence.start},${evidence.end})`);
  }
}

function verifyExactRequirementIds(
  actualIds: string[],
  expectedIds: string[]
): void {
  if (
    actualIds.length !== expectedIds.length ||
    new Set(actualIds).size !== actualIds.length ||
    expectedIds.some((id) => !actualIds.includes(id))
  ) {
    invalid("requirement IDs do not match the task");
  }
}

export function validatePartTwoProviderResult(
  providerResult: WritingPartTwoProviderResult,
  context: ValidationContext
): WritingPartTwoProviderResult {
  const parsed = writingPartTwoProviderResultSchema.safeParse(providerResult);
  if (!parsed.success) invalid("schema validation failed");
  const result = parsed.data;
  verifyExactRequirementIds(
    result.taskCompletion.requirements.map(
      (requirement) => requirement.requirementId
    ),
    context.requirementIds
  );

  for (const requirement of result.taskCompletion.requirements) {
    for (const item of requirement.evidence) {
      verifyEvidence(context.responseText, item);
    }
  }
  for (const detected of result.sentenceVariety.detected) {
    verifyEvidence(context.responseText, detected.evidence);
  }
  for (const error of result.grammar.errors) {
    verifyEvidence(context.responseText, error.evidence);
  }
  for (const item of result.paraphrase.copiedRanges) {
    verifyEvidence(context.responseText, item);
  }

  const improvedValidation = validatePartTwoResponse(result.improvedEmail.text);
  const improvedHasBlockingIssue = improvedValidation.issues.some(
    (issue) => issue.code !== "MIN_WORDS"
  );
  if (!improvedValidation.valid && improvedHasBlockingIssue) {
    invalid("improved email failed response validation or word count check");
  }
  result.improvedEmail.wordCount = improvedValidation.wordCount;
  verifyExactRequirementIds(
    result.improvedEmail.requirementCoverage.map(
      (coverage) => coverage.requirementId
    ),
    context.requirementIds
  );
  for (const coverage of result.improvedEmail.requirementCoverage) {
    for (const item of coverage.evidence) {
      verifyEvidence(result.improvedEmail.text, item);
    }
  }

  return result;
}
