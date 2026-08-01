import type {
  ToeicReadingDraft,
  ToeicReadingSubmissionPayload,
} from "@repo/shared";

export type ToeicReadingSessionState = {
  activeQuestionId: number | null;
  answers: Record<number, number>;
  reviewQuestionIds: number[];
};

export function createToeicReadingSessionState(): ToeicReadingSessionState {
  return { activeQuestionId: null, answers: {}, reviewQuestionIds: [] };
}

export function restoreToeicReadingSessionState(
  draft: ToeicReadingDraft | null,
  questionIds: number[]
): ToeicReadingSessionState {
  if (!draft) return createToeicReadingSessionState();
  const allowed = new Set(questionIds);
  const answers = Object.fromEntries(
    draft.answers
      .filter((answer) => allowed.has(answer.questionId))
      .map((answer) => [answer.questionId, answer.optionId])
  );
  return {
    activeQuestionId: allowed.has(draft.activeQuestionId)
      ? draft.activeQuestionId
      : (questionIds[0] ?? null),
    answers,
    reviewQuestionIds: draft.reviewQuestionIds
      .filter((questionId) => allowed.has(questionId))
      .sort((left, right) => left - right),
  };
}

export function getToeicActiveQuestionId(
  state: ToeicReadingSessionState,
  questionIds: number[]
) {
  if (
    state.activeQuestionId !== null &&
    questionIds.includes(state.activeQuestionId)
  ) {
    return state.activeQuestionId;
  }
  return questionIds[0] ?? null;
}

export function selectToeicQuestion(
  state: ToeicReadingSessionState,
  questionIds: number[],
  questionId: number
): ToeicReadingSessionState {
  if (!questionIds.includes(questionId)) return state;
  return { ...state, activeQuestionId: questionId };
}

export function moveToeicQuestion(
  state: ToeicReadingSessionState,
  questionIds: number[],
  offset: number
): ToeicReadingSessionState {
  const activeQuestionId = getToeicActiveQuestionId(state, questionIds);
  if (activeQuestionId === null) return state;
  const currentIndex = questionIds.indexOf(activeQuestionId);
  const nextIndex = Math.min(
    questionIds.length - 1,
    Math.max(0, currentIndex + offset)
  );
  return { ...state, activeQuestionId: questionIds[nextIndex] ?? null };
}

export function selectToeicAnswer(
  state: ToeicReadingSessionState,
  questionId: number,
  optionId: number
): ToeicReadingSessionState {
  return {
    ...state,
    answers: { ...state.answers, [questionId]: optionId },
  };
}

export function toggleToeicReview(
  state: ToeicReadingSessionState,
  questionId: number
): ToeicReadingSessionState {
  const marked = state.reviewQuestionIds.includes(questionId);
  return {
    ...state,
    reviewQuestionIds: marked
      ? state.reviewQuestionIds.filter((id) => id !== questionId)
      : [...state.reviewQuestionIds, questionId].sort(
          (left, right) => left - right
        ),
  };
}

export function getToeicAnsweredCount(state: ToeicReadingSessionState) {
  return Object.keys(state.answers).length;
}

export function buildToeicSubmissionAnswers(
  state: ToeicReadingSessionState,
  questionIds: number[]
): ToeicReadingSubmissionPayload["answers"] | null {
  const answers = questionIds.map((questionId) => {
    const optionId = state.answers[questionId];
    return optionId === undefined ? null : { questionId, optionId };
  });
  return answers.some((answer) => answer === null)
    ? null
    : (answers as ToeicReadingSubmissionPayload["answers"]);
}
