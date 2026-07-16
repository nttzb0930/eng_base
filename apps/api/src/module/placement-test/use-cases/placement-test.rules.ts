export const PLACEMENT_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export const PLACEMENT_QUESTION_COUNT = 15;

export function questionType(answeredCount: number): "SELECT" | "ASSIST" {
  const questionNumber = answeredCount + 1;
  return questionNumber > 5 && questionNumber <= 10 ? "ASSIST" : "SELECT";
}

export function levelFallbacks(theta: number) {
  const targetIndex = Math.max(0, Math.min(3, Math.floor(theta + 0.5) - 1));
  return {
    targetLevel: PLACEMENT_LEVELS[targetIndex],
    levels: [
      ...new Set([
        PLACEMENT_LEVELS[targetIndex],
        PLACEMENT_LEVELS[Math.max(0, targetIndex - 1)],
        PLACEMENT_LEVELS[Math.min(3, targetIndex + 1)],
        ...PLACEMENT_LEVELS.filter(
          (_, index) => Math.abs(index - targetIndex) > 1
        ),
      ]),
    ],
  };
}

export function nextTheta(
  currentTheta: number,
  answeredCount: number,
  correct: boolean
) {
  const questionNumber = answeredCount + 1;
  const step = questionNumber > 10 ? 0.2 : questionNumber > 5 ? 0.4 : 0.8;
  return Math.max(1, Math.min(4, currentTheta + (correct ? step : -step)));
}

export function placementResult(thetaHistory: number[]) {
  const scores = thetaHistory.slice(10, 15);
  const finalScore = scores.reduce((sum, score) => sum + score, 0) / 5;
  const bufferOptions =
    finalScore >= 1.35 && finalScore <= 1.65
      ? ["A1", "A2"]
      : finalScore >= 2.35 && finalScore <= 2.65
        ? ["A2", "B1"]
        : finalScore >= 3.35 && finalScore <= 3.65
          ? ["B1", "B2"]
          : [];
  const recommendedLevel =
    bufferOptions.length > 0
      ? "A1"
      : finalScore >= 3.5
        ? "B2"
        : finalScore >= 2.5
          ? "B1"
          : finalScore >= 1.5
            ? "A2"
            : "A1";
  return {
    finalScore,
    bufferOptions,
    inBufferZone: bufferOptions.length > 0,
    recommendedLevel,
  };
}
