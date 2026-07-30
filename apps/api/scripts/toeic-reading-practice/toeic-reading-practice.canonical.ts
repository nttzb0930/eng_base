import { createHash } from "node:crypto";

import { z } from "zod";

import {
  TOEIC_READING_PART_COUNTS,
  type ToeicReadingChoice,
  type ToeicReadingMediaReference,
  type ToeicReadingPracticeTest,
} from "./toeic-reading-practice.types.js";

const nullableString = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  });

const questionSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    test_id: z.union([z.string(), z.number()]).transform(String),
    part: z.union([z.literal(5), z.literal(6), z.literal(7)]),
    question_number: z.coerce.number().int().min(101).max(200),
    passage_id: z
      .union([z.string(), z.number()])
      .transform(String)
      .nullable()
      .optional(),
    image_url: nullableString,
    question_text: z.string().trim(),
    option_a: z.string(),
    option_b: z.string(),
    option_c: z.string(),
    option_d: z.string(),
    correct_answer: z.enum(["A", "B", "C", "D"]),
    dich_nghia: nullableString,
    explanation_vi: nullableString,
  })
  .passthrough();

const passageSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    test_id: z.union([z.string(), z.number()]).transform(String),
    part: z.union([z.literal(6), z.literal(7)]),
    image_url: nullableString,
    passage_text: nullableString,
    passage_text_2: nullableString,
    passage_text_3: nullableString,
    dich_nghia: nullableString,
  })
  .passthrough();

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "sourceVersion" && key !== "practiceStats")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)])
    );
  }
  return value;
}

export function sha256Canonical(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function mediaReference(url: string): ToeicReadingMediaReference {
  return {
    id: sha256Canonical(url).slice(0, 24),
    sourceUrl: url,
    storagePath: null,
    sha256: null,
    bytes: null,
    contentType: null,
    status: "PENDING",
  };
}

function choices(row: z.infer<typeof questionSchema>): ToeicReadingChoice[] {
  const values = [
    ["A", row.option_a],
    ["B", row.option_b],
    ["C", row.option_c],
    ["D", row.option_d],
  ] as const;
  return values.map(([label, text]) => ({
    label,
    text,
    correct: row.correct_answer === label,
  }));
}

export function buildToeicReadingPracticeTest(input: {
  sourceSetId: string;
  sourceTestId: string;
  title: string;
  questions: unknown[];
  passages: unknown[];
}): Omit<ToeicReadingPracticeTest, "sourceVersion"> {
  const questions = input.questions.map((row) => questionSchema.parse(row));
  const passages = input.passages.map((row) => passageSchema.parse(row));
  const passageById = new Map(passages.map((row) => [row.id, row]));
  const mediaByUrl = new Map<string, ToeicReadingMediaReference>();

  for (const row of [...questions, ...passages]) {
    if (row.image_url)
      mediaByUrl.set(row.image_url, mediaReference(row.image_url));
  }

  const parts = ([5, 6, 7] as const).map((part) => {
    const partQuestions = questions
      .filter((row) => row.part === part)
      .sort((left, right) => left.question_number - right.question_number)
      .map((row) => ({
        sourceQuestionId: row.id,
        sourceNumber: row.question_number,
        stimulusId: row.passage_id ?? null,
        prompt: row.question_text,
        translation: row.dich_nghia,
        explanation: row.explanation_vi,
        choices: choices(row),
      }));
    const passageIds = [
      ...new Set(partQuestions.flatMap((row) => row.stimulusId ?? [])),
    ];
    const stimuli = passageIds.map((id) => {
      const row = passageById.get(id);
      if (!row) throw new Error(`Missing passage ${id}`);
      const bodies = [
        row.passage_text,
        row.passage_text_2,
        row.passage_text_3,
      ].filter((value): value is string => Boolean(value));
      return {
        sourceStimulusId: id,
        kind: row.image_url
          ? bodies.length > 0
            ? ("mixed" as const)
            : ("image" as const)
          : ("text" as const),
        body: bodies.length > 0 ? bodies.join("\n\n") : null,
        translation: row.dich_nghia,
        mediaIds: row.image_url ? [mediaByUrl.get(row.image_url)!.id] : [],
      };
    });
    return { part, stimuli, questions: partQuestions };
  });

  return {
    schemaVersion: 1,
    source: "dautoeic",
    sourceSetId: input.sourceSetId,
    sourceTestId: input.sourceTestId,
    title: input.title.trim(),
    parts,
    media: [...mediaByUrl.values()].sort((left, right) =>
      left.id.localeCompare(right.id)
    ),
  };
}

export function withSourceVersion(
  value: Omit<ToeicReadingPracticeTest, "sourceVersion">
): ToeicReadingPracticeTest {
  return { ...value, sourceVersion: sha256Canonical(value) };
}

export function validateToeicReadingPracticeTest(
  value: unknown,
  options: { requireDownloadedMedia?: boolean } = {}
) {
  const errors: string[] = [];
  if (!value || typeof value !== "object") {
    return { valid: false, errors: ["Package must be an object"] };
  }
  const test = value as ToeicReadingPracticeTest;
  const allQuestions = test.parts?.flatMap((part) => part.questions) ?? [];
  const ids = new Set<string>();
  const numbers = new Set<number>();

  for (const part of [5, 6, 7] as const) {
    const found = test.parts?.find((entry) => entry.part === part);
    if (found?.questions.length !== TOEIC_READING_PART_COUNTS[part]) {
      errors.push(
        `Part ${part} must contain ${TOEIC_READING_PART_COUNTS[part]} questions`
      );
    }
  }
  for (const question of allQuestions) {
    if (ids.has(question.sourceQuestionId))
      errors.push("Duplicate question ID");
    if (numbers.has(question.sourceNumber))
      errors.push("Duplicate question number");
    ids.add(question.sourceQuestionId);
    numbers.add(question.sourceNumber);
    if (question.choices.filter((choice) => choice.correct).length !== 1) {
      errors.push(
        `Question ${question.sourceNumber} must have one correct choice`
      );
    }
  }
  if (
    allQuestions.length !== 100 ||
    Array.from({ length: 100 }, (_, index) => index + 101).some(
      (number) => !numbers.has(number)
    )
  ) {
    errors.push("Reading questions must be numbered 101..200");
  }
  if (
    options.requireDownloadedMedia &&
    test.media?.some((media) => media.status !== "DOWNLOADED")
  ) {
    errors.push("Reading media must be downloaded");
  }
  if (test.sourceVersion !== sha256Canonical(test)) {
    errors.push("Source version does not match canonical content");
  }
  return { valid: errors.length === 0, errors };
}
