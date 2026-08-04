import type {
  ToeicReadingDraft,
  ToeicReadingDraftAnswer,
  ToeicReadingPart,
} from "@repo/shared";

export type ToeicReadingDraftScope = "FULL" | "PART_5" | "PART_6" | "PART_7";

type StoredDraft = {
  test_id: number;
  source_version: string;
  scope: string;
  active_question_id: number;
  answers: unknown;
  review_question_ids: number[];
  updated_at: Date;
  expires_at: Date;
};

export function toeicReadingDraftScope(
  part?: ToeicReadingPart
): ToeicReadingDraftScope {
  return part === undefined ? "FULL" : `PART_${part}`;
}

export function toeicReadingDraftPart(
  scope: string
): ToeicReadingPart | undefined {
  if (scope === "PART_5") return 5;
  if (scope === "PART_6") return 6;
  if (scope === "PART_7") return 7;
  return undefined;
}

function readAnswers(value: unknown): ToeicReadingDraftAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((answer) => {
    if (
      typeof answer !== "object" ||
      answer === null ||
      !("questionId" in answer) ||
      !("optionId" in answer) ||
      typeof answer.questionId !== "number" ||
      typeof answer.optionId !== "number"
    ) {
      return [];
    }
    return [{ questionId: answer.questionId, optionId: answer.optionId }];
  });
}

export function mapToeicReadingDraft(draft: StoredDraft): ToeicReadingDraft {
  const practicePart = toeicReadingDraftPart(draft.scope);
  return {
    testId: draft.test_id,
    sourceVersion: draft.source_version,
    ...(practicePart === undefined ? {} : { practicePart }),
    activeQuestionId: draft.active_question_id,
    answers: readAnswers(draft.answers),
    reviewQuestionIds: draft.review_question_ids,
    updatedAt: draft.updated_at.toISOString(),
    expiresAt: draft.expires_at.toISOString(),
  };
}
