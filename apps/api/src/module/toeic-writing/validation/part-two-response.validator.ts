import {
  getToeicWritingResponseLength,
  TOEIC_WRITING_RESPONSE_LIMITS,
  TOEIC_WRITING_WORD_LIMITS,
  type ToeicWritingValidationResult,
} from "@repo/shared";

import {
  countToeicWritingWords,
  normalizeToeicWritingText,
} from "./toeic-writing-text.utils";

const KEYBOARD_SMASH_PATTERN =
  /^(.)\1{3,}$|^[asdfghjklqwertyuiopzxcvbnm]{12,}$/iu;

function containsObviousSpam(tokens: string[]): boolean {
  const normalized = tokens.map((token) => token.toLocaleLowerCase("en-US"));
  const frequencies = new Map<string, number>();

  for (const token of normalized) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }

  const highestFrequency = Math.max(0, ...frequencies.values());
  const repeatsDominantly =
    normalized.length >= 20 && highestFrequency / normalized.length > 0.55;
  const keyboardSmashCount = normalized.filter((token) =>
    KEYBOARD_SMASH_PATTERN.test(token)
  ).length;

  return repeatsDominantly || keyboardSmashCount >= 3;
}

export function validatePartTwoResponse(
  responseText: string
): ToeicWritingValidationResult {
  const normalized = normalizeToeicWritingText(responseText);
  const tokens = normalized
    .split(/\s+/u)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  const wordCount = countToeicWritingWords(normalized);
  const issues: ToeicWritingValidationResult["issues"] = [];
  const limits = TOEIC_WRITING_WORD_LIMITS[2];

  if (wordCount < limits.min) issues.push({ code: "MIN_WORDS" });
  if (wordCount > limits.max) issues.push({ code: "MAX_WORDS" });
  if (
    getToeicWritingResponseLength(normalized) > TOEIC_WRITING_RESPONSE_LIMITS[2]
  ) {
    issues.push({ code: "MAX_CHARACTERS" });
  }
  if (containsObviousSpam(tokens)) issues.push({ code: "OBVIOUS_SPAM" });

  return { valid: issues.length === 0, issues, wordCount };
}
