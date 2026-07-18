"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  createLearningSessionCompletionGate,
  createLearningSessionState,
  learningSessionReducer,
} from "./learning-session-state";

export function useLearningSession<TItem>({
  complete,
  onComplete,
}: {
  complete: boolean;
  onComplete(items: TItem[]): void | Promise<void>;
}) {
  const [state, dispatch] = useReducer(
    learningSessionReducer<TItem>,
    createLearningSessionState<TItem>(),
  );
  const completionGate = useRef(createLearningSessionCompletionGate<TItem>());

  useEffect(() => {
    if (!complete || state.reviewedItems.length === 0) return;
    completionGate.current.record(state.reviewedItems, onComplete);
  }, [complete, onComplete, state.reviewedItems]);

  const recordAnswer = useCallback((correct: boolean, item: TItem) => {
    dispatch({ type: "record-answer", correct, item });
  }, []);

  const clearFeedback = useCallback(() => {
    dispatch({ type: "clear-feedback" });
  }, []);

  const reset = useCallback(() => {
    completionGate.current.reset();
    dispatch({ type: "reset" });
  }, []);

  return { state, recordAnswer, clearFeedback, reset };
}
