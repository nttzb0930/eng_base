import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { z } from "zod";

import type {
  VocabularyCatalogItem,
  VocabularyTopicDefinition,
} from "../../vocabulary/catalog/vocabulary-catalog.js";

const optionSchema = z
  .object({
    text: z.string().trim().min(1),
    correct: z.boolean(),
  })
  .strict();

const questionSchema = z
  .object({
    prompt: z.string().trim().min(1),
    options: z.array(optionSchema).length(3),
  })
  .strict();

const passageSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    title: z.string().trim().min(1),
    cefrLevel: z.literal("A1"),
    topicSlug: z.string().trim().min(1),
    estimatedMinutes: z.number().int().positive(),
    body: z.string().trim().min(1),
    questions: z.array(questionSchema).length(4),
  })
  .strict();

const packSchema = z
  .array(passageSchema)
  .length(12, "Reading content pack must contain exactly 12 passages");

export type ReadingContentOption = z.infer<typeof optionSchema>;
export type ReadingContentQuestion = z.infer<typeof questionSchema>;
export type ReadingContentPassage = z.infer<typeof passageSchema>;

export type ReadingVocabularyAudit = {
  unknownWords: string[];
  aboveA1Words: Array<{ word: string; cefrLevels: string[] }>;
};

const normalize = (value: string) => value.trim().toLocaleLowerCase("en-US");

const formatSchemaErrors = (error: z.ZodError) =>
  error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "pack";
      return `${path}: ${issue.message}`;
    })
    .join("\n");

export function validateReadingContentPack(
  input: unknown,
  topics: VocabularyTopicDefinition[]
): ReadingContentPassage[] {
  const parsed = packSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatSchemaErrors(parsed.error));
  }

  const errors: string[] = [];
  const knownTopicSlugs = new Set(topics.map((topic) => topic.slug));
  const seenSlugs = new Set<string>();

  parsed.data.forEach((passage, passageIndex) => {
    const path = `passages[${passageIndex}]`;
    const normalizedSlug = normalize(passage.slug);
    if (seenSlugs.has(normalizedSlug)) {
      errors.push(`${path}.slug: duplicate slug "${passage.slug}"`);
    } else {
      seenSlugs.add(normalizedSlug);
    }

    if (!knownTopicSlugs.has(passage.topicSlug)) {
      errors.push(`${path}.topicSlug: unknown Topic "${passage.topicSlug}"`);
    }

    const wordCount = passage.body.trim().split(/\s+/u).filter(Boolean).length;
    if (wordCount < 80 || wordCount > 120) {
      errors.push(
        `${path}.body: expected 80 to 120 words, received ${wordCount}`
      );
    }

    const seenPrompts = new Set<string>();
    passage.questions.forEach((question, questionIndex) => {
      const questionPath = `${path}.questions[${questionIndex}]`;
      const normalizedPrompt = normalize(question.prompt);
      if (seenPrompts.has(normalizedPrompt)) {
        errors.push(
          `${questionPath}.prompt: duplicate question prompt "${question.prompt}"`
        );
      } else {
        seenPrompts.add(normalizedPrompt);
      }

      const seenOptions = new Set<string>();
      question.options.forEach((answerOption, optionIndex) => {
        const normalizedOption = normalize(answerOption.text);
        if (seenOptions.has(normalizedOption)) {
          errors.push(
            `${questionPath}.options[${optionIndex}]: duplicate option "${answerOption.text}"`
          );
        } else {
          seenOptions.add(normalizedOption);
        }
      });

      const correctOptionCount = question.options.filter(
        (answerOption) => answerOption.correct
      ).length;
      if (correctOptionCount !== 1) {
        errors.push(
          `${questionPath}.options: expected exactly one correct option, received ${correctOptionCount}`
        );
      }
    });
  });

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return parsed.data;
}

export function auditReadingVocabulary(
  passages: ReadingContentPassage[],
  catalog: VocabularyCatalogItem[]
): ReadingVocabularyAudit {
  const levelsByWord = new Map<string, Set<string>>();
  for (const item of catalog) {
    const word = normalize(item.normalizedWord);
    const levels = levelsByWord.get(word) ?? new Set<string>();
    levels.add(item.cefrLevel.toUpperCase());
    levelsByWord.set(word, levels);
  }

  const contentWords = new Set(
    passages.flatMap((passage) =>
      [...passage.body.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/gu)].map((match) =>
        normalize(match[0])
      )
    )
  );
  const unknownWords: string[] = [];
  const aboveA1Words: ReadingVocabularyAudit["aboveA1Words"] = [];

  for (const word of [...contentWords].sort()) {
    const levels = levelsByWord.get(word);
    if (!levels) {
      unknownWords.push(word);
      continue;
    }
    if (!levels.has("A1")) {
      aboveA1Words.push({
        word,
        cefrLevels: [...levels].sort(),
      });
    }
  }

  return { unknownWords, aboveA1Words };
}

export function loadCanonicalReadingContent(): unknown {
  const repositoryRoot = resolve(process.cwd(), "../..");
  const readingPath = join(
    repositoryRoot,
    "data",
    "reading",
    "a1",
    "passages.json"
  );
  return JSON.parse(readFileSync(readingPath, "utf8")) as unknown;
}
