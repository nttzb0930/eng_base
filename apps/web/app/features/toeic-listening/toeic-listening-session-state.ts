import type {
  ToeicListeningDraft,
  ToeicListeningLearnerQuestion,
  ToeicListeningLearnerStimulus,
  ToeicListeningPart,
  ToeicListeningSubmissionPayload,
  ToeicListeningTestDetail,
} from "@repo/shared";

export type ToeicListeningSessionState = {
  activeQuestionId: number | null;
  answers: Record<number, number>;
  reviewQuestionIds: number[];
  completedMediaIds: number[];
  activeMediaId: number | null;
  playbackPositionMs: number;
};

export type ToeicListeningQuestionGroup = {
  key: string;
  part: ToeicListeningPart;
  stimulus: ToeicListeningLearnerStimulus | null;
  questions: ToeicListeningLearnerQuestion[];
};

export function createToeicListeningSessionState(): ToeicListeningSessionState {
  return {
    activeQuestionId: null,
    answers: {},
    reviewQuestionIds: [],
    completedMediaIds: [],
    activeMediaId: null,
    playbackPositionMs: 0,
  };
}

export function restoreToeicListeningSessionState(
  draft: ToeicListeningDraft | null,
  questionIds: number[],
  mediaIds: number[]
): ToeicListeningSessionState {
  if (!draft) return createToeicListeningSessionState();
  const allowedQuestions = new Set(questionIds);
  const allowedMedia = new Set(mediaIds);
  const activeMediaId =
    draft.activeMediaId !== null && allowedMedia.has(draft.activeMediaId)
      ? draft.activeMediaId
      : null;
  return {
    activeQuestionId: allowedQuestions.has(draft.activeQuestionId)
      ? draft.activeQuestionId
      : (questionIds[0] ?? null),
    answers: Object.fromEntries(
      draft.answers
        .filter((answer) => allowedQuestions.has(answer.questionId))
        .map((answer) => [answer.questionId, answer.optionId])
    ),
    reviewQuestionIds: draft.reviewQuestionIds
      .filter((questionId) => allowedQuestions.has(questionId))
      .sort((left, right) => left - right),
    completedMediaIds: draft.completedMediaIds
      .filter((mediaId) => allowedMedia.has(mediaId))
      .sort((left, right) => left - right),
    activeMediaId,
    playbackPositionMs: activeMediaId === null ? 0 : draft.playbackPositionMs,
  };
}

export function groupToeicListeningQuestions(
  test: ToeicListeningTestDetail
): ToeicListeningQuestionGroup[] {
  return test.parts.flatMap((part) => {
    const questions = [...part.questions].sort(
      (left, right) => left.number - right.number
    );
    if (part.part === 1 || part.part === 2) {
      return questions.map((question) => ({
        key: `question-${question.id}`,
        part: part.part,
        stimulus: null,
        questions: [question],
      }));
    }

    const grouped = new Map<number | null, ToeicListeningLearnerQuestion[]>();
    for (const question of questions) {
      const key = question.stimulusId;
      grouped.set(key, [...(grouped.get(key) ?? []), question]);
    }
    return [...grouped.entries()].map(([stimulusId, groupQuestions]) => ({
      key:
        stimulusId === null
          ? `question-${groupQuestions[0]?.id ?? "unknown"}`
          : `stimulus-${stimulusId}`,
      part: part.part,
      stimulus:
        stimulusId === null
          ? null
          : (part.stimuli.find((stimulus) => stimulus.id === stimulusId) ??
            null),
      questions: groupQuestions,
    }));
  });
}

export function getToeicListeningActiveQuestionId(
  state: ToeicListeningSessionState,
  questionIds: number[]
) {
  return state.activeQuestionId !== null &&
    questionIds.includes(state.activeQuestionId)
    ? state.activeQuestionId
    : (questionIds[0] ?? null);
}

export function selectToeicListeningQuestion(
  state: ToeicListeningSessionState,
  questionIds: number[],
  questionId: number
): ToeicListeningSessionState {
  return questionIds.includes(questionId)
    ? { ...state, activeQuestionId: questionId }
    : state;
}

export function moveToeicListeningQuestion(
  state: ToeicListeningSessionState,
  questionIds: number[],
  offset: number
): ToeicListeningSessionState {
  const active = getToeicListeningActiveQuestionId(state, questionIds);
  if (active === null) return state;
  const index = questionIds.indexOf(active);
  const next = Math.min(questionIds.length - 1, Math.max(0, index + offset));
  return { ...state, activeQuestionId: questionIds[next] ?? null };
}

export function selectToeicListeningAnswer(
  state: ToeicListeningSessionState,
  questionId: number,
  optionId: number
): ToeicListeningSessionState {
  return {
    ...state,
    answers: { ...state.answers, [questionId]: optionId },
  };
}

export function toggleToeicListeningReview(
  state: ToeicListeningSessionState,
  questionId: number
): ToeicListeningSessionState {
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

export function buildToeicListeningSubmissionAnswers(
  state: ToeicListeningSessionState,
  questionIds: number[]
): ToeicListeningSubmissionPayload["answers"] | null {
  const answers = questionIds.map((questionId) => {
    const optionId = state.answers[questionId];
    return optionId === undefined ? null : { questionId, optionId };
  });
  return answers.some((answer) => answer === null)
    ? null
    : (answers as ToeicListeningSubmissionPayload["answers"]);
}
