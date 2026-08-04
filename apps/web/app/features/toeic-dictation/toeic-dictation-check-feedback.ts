import type {
  ToeicDictationCheckSegment,
  ToeicDictationWordResult,
} from "@repo/shared";

export type ToeicDictationCheckFeedbackSegment = ToeicDictationCheckSegment & {
  result: ToeicDictationWordResult | null;
  hiddenIndex: number | null;
};

export function mergeToeicDictationCheckFeedback(
  segments: ToeicDictationCheckSegment[],
  words: ToeicDictationWordResult[]
): ToeicDictationCheckFeedbackSegment[] {
  let resultIndex = 0;

  return segments.map((segment) => {
    if (!segment.hidden) {
      return { ...segment, result: null, hiddenIndex: null };
    }

    const hiddenIndex = resultIndex;
    const result = words[resultIndex] ?? null;
    resultIndex += 1;
    return { ...segment, result, hiddenIndex };
  });
}
