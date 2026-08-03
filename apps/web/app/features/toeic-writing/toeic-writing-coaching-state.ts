export function shouldConfirmCommunityRestore(localText: string): boolean {
  return localText.trim().length > 0;
}

export function canRestoreCommunityResponse(
  localText: string,
  confirmed: boolean
): boolean {
  return !shouldConfirmCommunityRestore(localText) || confirmed;
}

export function canLoadToeicWritingCoaching(
  taskId: number,
  contentVersion: string,
  open: boolean
): boolean {
  return (
    open &&
    Number.isInteger(taskId) &&
    taskId > 0 &&
    /^[a-f0-9]{64}$/u.test(contentVersion)
  );
}

export type PartTwoEditorMetrics = {
  wordCount: number;
  characterCount: number;
  ready: boolean;
};

export function getPartTwoEditorMetrics(
  responseText: string
): PartTwoEditorMetrics {
  const trimmed = responseText.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/u).length : 0;
  const characterCount = Array.from(trimmed).length;
  return {
    wordCount,
    characterCount,
    ready: wordCount >= 50 && wordCount <= 300 && characterCount <= 2_200,
  };
}

export function resolvePartTwoEditorChange(
  currentValue: string,
  nextValue: string
): { value: string; accepted: boolean; metrics: PartTwoEditorMetrics } {
  const metrics = getPartTwoEditorMetrics(nextValue);
  const accepted = metrics.wordCount <= 300 && metrics.characterCount <= 2_200;
  return {
    value: accepted ? nextValue : currentValue,
    accepted,
    metrics,
  };
}
