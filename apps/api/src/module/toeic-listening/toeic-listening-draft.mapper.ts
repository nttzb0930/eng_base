import type {
  ToeicListeningDraft,
  ToeicListeningDraftAnswer,
  ToeicListeningPart,
} from "@repo/shared";
export type ToeicListeningDraftScope =
  "FULL" | "PART_1" | "PART_2" | "PART_3" | "PART_4";
export const toeicListeningDraftScope = (
  part?: ToeicListeningPart
): ToeicListeningDraftScope => (part === undefined ? "FULL" : `PART_${part}`);
function part(scope: string): ToeicListeningPart | undefined {
  if (scope === "PART_1") return 1;
  if (scope === "PART_2") return 2;
  if (scope === "PART_3") return 3;
  if (scope === "PART_4") return 4;
}
function answers(value: unknown): ToeicListeningDraftAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    typeof item === "object" &&
    item !== null &&
    "questionId" in item &&
    "optionId" in item &&
    typeof item.questionId === "number" &&
    typeof item.optionId === "number"
      ? [{ questionId: item.questionId, optionId: item.optionId }]
      : []
  );
}
export function mapToeicListeningDraft(draft: {
  test_id: number;
  scope: string;
  listening_source_version: string;
  active_question_id: number;
  answers: unknown;
  review_question_ids: number[];
  completed_media_ids: number[];
  active_media_id: number | null;
  playback_position_ms: number;
  updated_at: Date;
  expires_at: Date;
}): ToeicListeningDraft {
  const practicePart = part(draft.scope);
  return {
    testId: draft.test_id,
    listeningSourceVersion: draft.listening_source_version,
    ...(practicePart === undefined ? {} : { practicePart }),
    activeQuestionId: draft.active_question_id,
    answers: answers(draft.answers),
    reviewQuestionIds: draft.review_question_ids,
    completedMediaIds: draft.completed_media_ids,
    activeMediaId: draft.active_media_id,
    playbackPositionMs: draft.playback_position_ms,
    updatedAt: draft.updated_at.toISOString(),
    expiresAt: draft.expires_at.toISOString(),
  };
}
