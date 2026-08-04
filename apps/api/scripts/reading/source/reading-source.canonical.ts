import { createHash } from "node:crypto";

import { z } from "zod";

import { classifyReadingSourceAccess } from "./reading-source.policy.js";
import type {
  CanonicalReadingSourceMedia,
  CanonicalReadingSourcePackage,
  ReadingSourceQuestion,
  ReadingSourceRow,
} from "./reading-source.types.js";

const sourceIdSchema = z
  .union([z.string().trim().min(1), z.number().int().nonnegative()])
  .transform(String);

const sourceLevelSchema = z
  .union([z.literal("1"), z.literal("2"), z.literal(1), z.literal(2)])
  .transform((value): "1" | "2" => String(value) as "1" | "2");

const sourceChoiceSchema = z
  .object({
    label: z.string().trim().min(1),
    text: z.string().trim().min(1),
  })
  .strict();

const sourceQuestionSchema = z
  .object({
    question: z.string().trim().min(1),
    choices: z.array(sourceChoiceSchema).min(2),
    correct: z.string().trim().min(1),
    explanation: z.string(),
    translation: z.string(),
  })
  .strict();

const sourceRowSchema = z
  .object({
    id: sourceIdSchema,
    title: z.string().trim().min(1),
    topic: z.string().nullable(),
    level: sourceLevelSchema,
    order_index: z.number().int().nonnegative(),
    content_html: z.string().trim().min(1),
    questions_json: z.array(sourceQuestionSchema).min(1),
    vocabulary_json: z.array(z.unknown()),
    is_free: z.boolean(),
    is_hidden: z.boolean(),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict();

const storageKeySchema = z.string().min(1).refine(
  (value) => {
    if (value.startsWith("/") || value.startsWith("\\") || value.includes("\\")) {
      return false;
    }
    return value.split("/").every((segment) => segment !== "." && segment !== "..");
  },
  { message: "storageKey must be a safe relative POSIX path" },
);

const canonicalMediaSchema = z
  .object({
    id: z.string().trim().min(1),
    sourceUrl: z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === "https:", {
        message: "sourceUrl must use HTTPS",
      }),
    storageKey: storageKeySchema,
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    bytes: z.number().int().positive(),
    mimeType: z.string().regex(/^image\/[a-z0-9.+-]+$/u),
  })
  .strict();

const canonicalPackageSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z.literal("dautoeic"),
    sourceId: z.string().trim().min(1),
    sourceVersion: z.string().regex(/^[a-f0-9]{64}$/u),
    sourceLevel: z.enum(["1", "2"]),
    title: z.string().trim().min(1),
    sourceTopic: z.string().nullable(),
    order: z.number().int().nonnegative(),
    sourceHtml: z.string().trim().min(1),
    plainTextDraft: z.string().trim().min(1),
    questions: z.array(sourceQuestionSchema).min(1),
    vocabulary: z.array(z.unknown()),
    embeddedMedia: z.array(canonicalMediaSchema),
  })
  .strict();

const normalizeComparable = (value: string) =>
  value.trim().toLocaleLowerCase("en-US");

function formatSchemaError(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "row";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

function normalizeQuestions(
  questions: z.infer<typeof sourceQuestionSchema>[],
): ReadingSourceQuestion[] {
  return questions.map((question) => ({
    question: question.question.trim(),
    choices: question.choices.map((choice) => ({
      label: choice.label.trim().toUpperCase(),
      text: choice.text.trim(),
    })),
    correct: question.correct.trim().toUpperCase(),
    explanation: question.explanation.trim(),
    translation: question.translation.trim(),
  }));
}

function validateQuestions(questions: ReadingSourceQuestion[]) {
  const issues: string[] = [];
  const seenQuestions = new Set<string>();

  questions.forEach((question, questionIndex) => {
    const questionPath = `questions[${questionIndex}]`;
    const normalizedQuestion = normalizeComparable(question.question);
    if (seenQuestions.has(normalizedQuestion)) {
      issues.push(`${questionPath}: duplicate question`);
    } else {
      seenQuestions.add(normalizedQuestion);
    }

    const seenLabels = new Set<string>();
    const seenTexts = new Set<string>();
    for (const choice of question.choices) {
      const normalizedLabel = normalizeComparable(choice.label);
      if (seenLabels.has(normalizedLabel)) {
        issues.push(
          `${questionPath}: duplicate choice label "${choice.label}"`,
        );
      } else {
        seenLabels.add(normalizedLabel);
      }

      const normalizedText = normalizeComparable(choice.text);
      if (seenTexts.has(normalizedText)) {
        issues.push(`${questionPath}: duplicate choice text`);
      } else {
        seenTexts.add(normalizedText);
      }
    }

    if (!seenLabels.has(normalizeComparable(question.correct))) {
      issues.push(
        `${questionPath}: correct label "${question.correct}" does not resolve`,
      );
    }
  });

  if (issues.length > 0) {
    throw new Error(issues.join("\n"));
  }
}

export function parseReadingSourceRow(input: unknown): ReadingSourceRow {
  const parsed = sourceRowSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatSchemaError(parsed.error));
  }

  const access = classifyReadingSourceAccess({
    isFree: parsed.data.is_free,
    isHidden: parsed.data.is_hidden,
  });
  if (access.classification !== "BASIC_FREE") {
    throw new Error(
      `Reading source row ${parsed.data.id} is ${access.classification}`,
    );
  }

  const questions = normalizeQuestions(parsed.data.questions_json);
  validateQuestions(questions);

  return {
    sourceId: parsed.data.id,
    title: parsed.data.title.trim(),
    topic: parsed.data.topic?.trim() || null,
    sourceLevel: parsed.data.level,
    order: parsed.data.order_index,
    contentHtml: parsed.data.content_html.trim(),
    questions,
    vocabulary: parsed.data.vocabulary_json,
    access,
    updatedAt: parsed.data.updated_at,
  };
}

const dangerousBlockPattern =
  /<(script|style|template|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/giu;
const htmlCommentPattern = /<!--[\s\S]*?-->/gu;
const blockTagPattern =
  /<\/?(?:address|article|aside|blockquote|br|dd|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/giu;
const remainingTagPattern = /<[^>]*>/gu;

const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeEntities(value: string) {
  return value
    .replace(/&(amp|apos|gt|lt|nbsp|quot);/giu, (_, name: string) => {
      return namedEntities[name.toLocaleLowerCase("en-US")] ?? "";
    })
    .replace(/&#(x[0-9a-f]+|\d+);/giu, (entity, encoded: string) => {
      const hexadecimal = encoded[0]?.toLocaleLowerCase("en-US") === "x";
      const codePoint = Number.parseInt(
        hexadecimal ? encoded.slice(1) : encoded,
        hexadecimal ? 16 : 10,
      );
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return entity;
      }
    });
}

export function sourceHtmlToPlainText(html: string) {
  return decodeEntities(
    html
      .replace(htmlCommentPattern, "")
      .replace(dangerousBlockPattern, "")
      .replace(blockTagPattern, "\n")
      .replace(remainingTagPattern, ""),
  )
    .replace(/\r\n?/gu, "\n")
    .replace(/[\t\f\v ]+/gu, " ")
    .replace(/ *\n */gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJsonValue(child)]),
    );
  }
  return value;
}

export function stableJson(value: unknown) {
  const serialized = JSON.stringify(sortJsonValue(value));
  if (serialized === undefined) {
    throw new Error("Value cannot be serialized as stable JSON");
  }
  return serialized;
}

export function sha256Text(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sourceVersion(row: ReadingSourceRow) {
  return sha256Text(
    stableJson({
      sourceId: row.sourceId,
      title: row.title,
      topic: row.topic,
      sourceLevel: row.sourceLevel,
      order: row.order,
      contentHtml: row.contentHtml,
      questions: row.questions,
      vocabulary: row.vocabulary,
      updatedAt: row.updatedAt,
    }),
  );
}

export function buildCanonicalReadingPackage(
  row: ReadingSourceRow,
  media: CanonicalReadingSourceMedia[],
): CanonicalReadingSourcePackage {
  return {
    schemaVersion: 1,
    source: "dautoeic",
    sourceId: row.sourceId,
    sourceVersion: sourceVersion(row),
    sourceLevel: row.sourceLevel,
    title: row.title,
    sourceTopic: row.topic,
    order: row.order,
    sourceHtml: row.contentHtml,
    plainTextDraft: sourceHtmlToPlainText(row.contentHtml),
    questions: row.questions,
    vocabulary: row.vocabulary,
    embeddedMedia: [...media].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
  };
}

export function validateCanonicalReadingPackage(
  input: unknown,
): CanonicalReadingSourcePackage {
  const parsed = canonicalPackageSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatSchemaError(parsed.error));
  }

  validateQuestions(parsed.data.questions);
  const mediaIds = parsed.data.embeddedMedia.map((media) => media.id);
  if (new Set(mediaIds).size !== mediaIds.length) {
    throw new Error("embeddedMedia: duplicate media ID");
  }

  return parsed.data;
}
