import {
  getToeicWritingResponseLength,
  TOEIC_WRITING_RESPONSE_LIMITS,
  TOEIC_WRITING_WORD_LIMITS,
  type ToeicWritingPartOneValidationIssue,
} from "@repo/shared";

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

function words(value: string): string[] {
  return (
    value.normalize("NFKC").toLocaleLowerCase("en-US").match(WORD_PATTERN) ?? []
  );
}

function containsRequiredWord(tokens: string[], requiredWord: string): boolean {
  const required = requiredWord.toLocaleLowerCase("en-US");
  const candidates = new Set([
    required,
    `${required}s`,
    `${required}es`,
    required.endsWith("e") ? `${required.slice(0, -1)}ing` : `${required}ing`,
    `${required}ed`,
  ]);
  return tokens.some((token) => candidates.has(token));
}

export function validatePartOneEditorResponse(
  responseText: string,
  requiredWords: string[]
): { valid: boolean; issues: ToeicWritingPartOneValidationIssue[] } {
  const normalized = responseText.normalize("NFKC").trim();
  const tokens = words(normalized);
  const issues: ToeicWritingPartOneValidationIssue[] = [];
  const limits = TOEIC_WRITING_WORD_LIMITS[1];
  if (tokens.length < limits.min) issues.push({ code: "MIN_WORDS" });
  if (tokens.length > limits.max) issues.push({ code: "MAX_WORDS" });
  if (
    getToeicWritingResponseLength(normalized) > TOEIC_WRITING_RESPONSE_LIMITS[1]
  ) {
    issues.push({ code: "MAX_CHARACTERS" });
  }
  const firstLetter = normalized.match(/\p{L}/u)?.[0];
  if (!firstLetter || firstLetter !== firstLetter.toLocaleUpperCase("en-US")) {
    issues.push({ code: "UPPERCASE_START_REQUIRED" });
  }
  if (!/[.!?]$/u.test(normalized)) {
    issues.push({ code: "TERMINAL_PUNCTUATION_REQUIRED" });
  }
  if ((normalized.match(/[.!?]+(?=\s|$)/gu) ?? []).length > 1) {
    issues.push({ code: "ONE_SENTENCE_REQUIRED" });
  }
  for (const keyword of requiredWords) {
    if (!containsRequiredWord(tokens, keyword)) {
      issues.push({ code: "REQUIRED_WORD_MISSING", keyword });
    }
  }
  const repeated = tokens.some(
    (token) => tokens.filter((candidate) => candidate === token).length >= 4
  );
  const keyboardSmash = tokens.some(
    (token) => token.length >= 10 && !/[aeiouy]/u.test(token)
  );
  if (repeated || keyboardSmash) issues.push({ code: "OBVIOUS_SPAM" });
  return { valid: issues.length === 0, issues };
}

export function getPartOneGradePresentation(
  score: 0 | 1 | 2 | 3
): "CORRECTION" | "IMPROVEMENT" {
  return score === 3 ? "IMPROVEMENT" : "CORRECTION";
}
