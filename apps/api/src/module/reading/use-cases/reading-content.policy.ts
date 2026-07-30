import {
  READING_CEFR_LEVELS,
  type CreateReadingPassagePayload,
  type UpdateReadingPassagePayload,
} from "@repo/shared";

type ReadingContentInput =
  | CreateReadingPassagePayload
  | (UpdateReadingPassagePayload & { slug?: string });

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

function hasDuplicate(values: number[]) {
  return new Set(values).size !== values.length;
}

export function validateReadingContent(input: ReadingContentInput): string[] {
  const issues: string[] = [];

  if ("slug" in input && !input.slug?.trim()) {
    issues.push("Passage slug is required");
  }
  if (!input.title.trim()) issues.push("Passage title is required");
  if (!input.body.trim()) issues.push("Passage body is required");
  if (!READING_CEFR_LEVELS.includes(input.cefrLevel)) {
    issues.push("Reading currently supports A1 only");
  }
  if (!isPositiveInteger(input.estimatedMinutes)) {
    issues.push("Estimated minutes must be a positive integer");
  }
  if (input.questions.length === 0) {
    issues.push("At least one question is required");
  }

  if (hasDuplicate(input.questions.map((question) => question.order))) {
    issues.push("Question order must be unique");
  }

  for (const question of input.questions) {
    if (!question.prompt.trim()) issues.push("Question prompt is required");
    if (!isPositiveInteger(question.order)) {
      issues.push("Question order must be a positive integer");
    }
    if (question.options.length < 2) {
      issues.push("Each question requires at least two options");
    }
    if (
      question.options.filter((option) => option.correct).length !== 1
    ) {
      issues.push("Each question requires exactly one correct option");
    }
    if (hasDuplicate(question.options.map((option) => option.order))) {
      issues.push("Option order must be unique within each question");
    }
    for (const option of question.options) {
      if (!option.text.trim()) issues.push("Option text is required");
      if (!isPositiveInteger(option.order)) {
        issues.push("Option order must be a positive integer");
      }
    }
  }

  return [...new Set(issues)];
}
