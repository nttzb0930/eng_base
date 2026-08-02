export type ToeicReadingPracticeUiState = {
  activeQuestionId: number;
  pendingOptionByQuestion: Record<number, number>;
  failedQuestionId: number | null;
};

export function createToeicReadingPracticeUiState(
  activeQuestionId: number
): ToeicReadingPracticeUiState {
  return {
    activeQuestionId,
    pendingOptionByQuestion: {},
    failedQuestionId: null,
  };
}

export function selectToeicReadingPracticeOption(
  state: ToeicReadingPracticeUiState,
  questionId: number,
  optionId: number
): ToeicReadingPracticeUiState {
  return {
    ...state,
    pendingOptionByQuestion: {
      ...state.pendingOptionByQuestion,
      [questionId]: optionId,
    },
    failedQuestionId:
      state.failedQuestionId === questionId ? null : state.failedQuestionId,
  };
}

export function failToeicReadingPracticeGrade(
  state: ToeicReadingPracticeUiState,
  questionId: number
): ToeicReadingPracticeUiState {
  return { ...state, failedQuestionId: questionId };
}

export function applyToeicReadingPracticeGrade(
  state: ToeicReadingPracticeUiState,
  result: { questionId: number; selectedOptionId: number }
): ToeicReadingPracticeUiState {
  const pendingOptionByQuestion = { ...state.pendingOptionByQuestion };
  delete pendingOptionByQuestion[result.questionId];
  return {
    ...state,
    pendingOptionByQuestion,
    failedQuestionId:
      state.failedQuestionId === result.questionId
        ? null
        : state.failedQuestionId,
  };
}
