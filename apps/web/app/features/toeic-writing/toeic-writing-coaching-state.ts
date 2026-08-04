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

const keyboardSmashPattern =
  /^(.)\1{3,}$|^[asdfghjklqwertyuiopzxcvbnm]{12,}$/iu;

function normalizedTokens(responseText: string): string[] {
  return responseText
    .trim()
    .split(/\s+/u)
    .map((token) =>
      token
        .normalize("NFKC")
        .toLocaleLowerCase("en")
        .replace(/[^\p{L}\p{N}]/gu, "")
    )
    .filter(Boolean);
}

export function validatePartTwoEditorResponse(
  responseText: string
): ToeicWritingValidationResult {
  const tokens = normalizedTokens(responseText);
  const wordCount = tokens.length;
  const characterCount = Array.from(responseText.trim()).length;
  const issues: ToeicWritingValidationResult["issues"] = [];

  if (wordCount < 50) issues.push({ code: "MIN_WORDS" });
  if (wordCount > 300) issues.push({ code: "MAX_WORDS" });
  if (characterCount > 2_200) issues.push({ code: "MAX_CHARACTERS" });

  const frequencies = new Map<string, number>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }
  const highestFrequency = Math.max(0, ...frequencies.values());
  const repeatedTokenRatio = wordCount === 0 ? 0 : highestFrequency / wordCount;
  const keyboardSmashCount = tokens.filter((token) =>
    keyboardSmashPattern.test(token)
  ).length;
  if (
    (wordCount >= 20 && repeatedTokenRatio > 0.55) ||
    keyboardSmashCount >= 3
  ) {
    issues.push({ code: "OBVIOUS_SPAM" });
  }

  return { valid: issues.length === 0, issues, wordCount };
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

export function shouldApplyPartTwoGradeResult(
  submittedResponse: string,
  currentResponse: string
): boolean {
  return submittedResponse === currentResponse;
}
import type { ToeicWritingValidationResult } from "@repo/shared";
