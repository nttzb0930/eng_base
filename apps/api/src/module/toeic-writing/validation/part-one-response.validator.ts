import {
  getToeicWritingResponseLength,
  TOEIC_WRITING_RESPONSE_LIMITS,
  TOEIC_WRITING_WORD_LIMITS,
} from "@repo/shared";

import {
  containsRequiredWord,
  countToeicWritingWords,
  looksLikeObviousSpam,
  normalizeToeicWritingText,
  tokenizeToeicWritingWords,
} from "./toeic-writing-text.utils";

export type PartOneResponseValidationIssueCode =
  | "MIN_WORDS"
  | "MAX_WORDS"
  | "MAX_CHARACTERS"
  | "UPPERCASE_START_REQUIRED"
  | "TERMINAL_PUNCTUATION_REQUIRED"
  | "ONE_SENTENCE_REQUIRED"
  | "REQUIRED_WORD_MISSING"
  | "OBVIOUS_SPAM";

export type PartOneResponseValidationIssue = {
  code: PartOneResponseValidationIssueCode;
  keyword?: string;
};

export type PartOneResponseValidationResult = {
  valid: boolean;
  issues: PartOneResponseValidationIssue[];
  wordCount: number;
};

type ValidatePartOneResponseInput = {
  responseText: string;
  requiredWords: string[];
};

export function validatePartOneResponse({
  responseText,
  requiredWords,
}: ValidatePartOneResponseInput): PartOneResponseValidationResult {
  const normalized = normalizeToeicWritingText(responseText);
  const tokens = tokenizeToeicWritingWords(normalized);
  const wordCount = countToeicWritingWords(normalized);
  const issues: PartOneResponseValidationIssue[] = [];
  const limits = TOEIC_WRITING_WORD_LIMITS[1];

  if (wordCount < limits.min) issues.push({ code: "MIN_WORDS" });
  if (wordCount > limits.max) issues.push({ code: "MAX_WORDS" });
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

  const sentenceEndings = normalized.match(/[.!?]+(?=\s|$)/gu) ?? [];
  if (sentenceEndings.length > 1) {
    issues.push({ code: "ONE_SENTENCE_REQUIRED" });
  }

  for (const keyword of requiredWords) {
    if (!containsRequiredWord(tokens, keyword)) {
      issues.push({ code: "REQUIRED_WORD_MISSING", keyword });
    }
  }

  if (looksLikeObviousSpam(tokens)) issues.push({ code: "OBVIOUS_SPAM" });

  return { valid: issues.length === 0, issues, wordCount };
}
