import type { LearningSessionStatus } from "../learning-session/learning-session-state";

export function shouldAdvanceAfterFeedback(status: LearningSessionStatus) {
  return status === "correct" || status === "wrong";
}
