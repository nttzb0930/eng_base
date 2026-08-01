export type ToeicDictationPracticeMode = "check" | "dictation" | "full";

export function getToeicDictationAutoPlayKey(
  itemId: number,
  mode: ToeicDictationPracticeMode
) {
  return `${itemId}:${mode}`;
}
