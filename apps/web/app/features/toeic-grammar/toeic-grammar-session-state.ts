import type { ToeicGrammarAnswerResult } from "@repo/shared";

export type ToeicGrammarPendingAnswer = {
  questionId: number;
  selectedOptionId: number;
  submissionKey: string;
  status: "pending" | "error";
};

export type ToeicGrammarSessionState = {
  activeQuestionId: number | null;
  pendingAnswer: ToeicGrammarPendingAnswer | null;
  feedback: Record<number, ToeicGrammarAnswerResult>;
};

export function createToeicGrammarSessionState(
  questionIds: number[],
  initialQuestionIndex: number
): ToeicGrammarSessionState {
  return {
    activeQuestionId:
      questionIds[
        Math.max(0, Math.min(initialQuestionIndex, questionIds.length - 1))
      ] ?? null,
    pendingAnswer: null,
    feedback: {},
  };
}

export function selectGrammarQuestion(
  state: ToeicGrammarSessionState,
  questionIds: number[],
  questionId: number
) {
  return questionIds.includes(questionId)
    ? { ...state, activeQuestionId: questionId }
    : state;
}

export function moveGrammarQuestion(
  state: ToeicGrammarSessionState,
  questionIds: number[],
  offset: number
) {
  if (state.activeQuestionId === null) return state;
  const index = questionIds.indexOf(state.activeQuestionId);
  const next = Math.max(0, Math.min(questionIds.length - 1, index + offset));
  return { ...state, activeQuestionId: questionIds[next] ?? null };
}

export function beginGrammarAnswer(
  state: ToeicGrammarSessionState,
  questionId: number,
  selectedOptionId: number,
  submissionKey: string
) {
  if (state.pendingAnswer || state.feedback[questionId]) return state;
  return {
    ...state,
    pendingAnswer: {
      questionId,
      selectedOptionId,
      submissionKey,
      status: "pending" as const,
    },
  };
}

export function answerGrammarQuestionFailed(state: ToeicGrammarSessionState) {
  return state.pendingAnswer
    ? {
        ...state,
        pendingAnswer: { ...state.pendingAnswer, status: "error" as const },
      }
    : state;
}

export function retryGrammarAnswer(state: ToeicGrammarSessionState) {
  return state.pendingAnswer?.status === "error"
    ? {
        questionId: state.pendingAnswer.questionId,
        selectedOptionId: state.pendingAnswer.selectedOptionId,
        submissionKey: state.pendingAnswer.submissionKey,
      }
    : null;
}

export function retryGrammarAnswerStarted(state: ToeicGrammarSessionState) {
  return state.pendingAnswer?.status === "error"
    ? {
        ...state,
        pendingAnswer: { ...state.pendingAnswer, status: "pending" as const },
      }
    : state;
}

export function answerGrammarQuestionSucceeded(
  state: ToeicGrammarSessionState,
  result: ToeicGrammarAnswerResult
) {
  return {
    ...state,
    pendingAnswer: null,
    feedback: { ...state.feedback, [result.questionId]: result },
  };
}
