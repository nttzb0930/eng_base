export type LearningSessionStatus = "none" | "wrong" | "correct";

export type LearningSessionState<TItem> = {
  status: LearningSessionStatus;
  correctCount: number;
  wrongCount: number;
  reviewedItems: TItem[];
};

export type LearningSessionAction<TItem> =
  | { type: "record-answer"; correct: boolean; item: TItem }
  | { type: "clear-feedback" }
  | { type: "reset" };

export function createLearningSessionState<TItem>(): LearningSessionState<TItem> {
  return {
    status: "none",
    correctCount: 0,
    wrongCount: 0,
    reviewedItems: [],
  };
}

export function learningSessionReducer<TItem>(
  state: LearningSessionState<TItem>,
  action: LearningSessionAction<TItem>,
): LearningSessionState<TItem> {
  switch (action.type) {
    case "record-answer":
      return {
        status: action.correct ? "correct" : "wrong",
        correctCount: state.correctCount + (action.correct ? 1 : 0),
        wrongCount: state.wrongCount + (action.correct ? 0 : 1),
        reviewedItems: [...state.reviewedItems, action.item],
      };
    case "clear-feedback":
      return { ...state, status: "none" };
    case "reset":
      return createLearningSessionState<TItem>();
  }
}

export function createLearningSessionCompletionGate<TItem>() {
  let recorded = false;

  return {
    record(items: TItem[], onComplete: (items: TItem[]) => void | Promise<void>) {
      if (recorded) return;
      recorded = true;
      void onComplete(items);
    },
    reset() {
      recorded = false;
    },
  };
}
