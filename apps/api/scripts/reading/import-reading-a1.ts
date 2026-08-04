import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import prisma from "../support/script-prisma.js";
import type {
  ReadingContentPassage,
  ReadingVocabularyAudit,
} from "./content/reading-content.js";
import {
  auditReadingVocabulary,
  loadCanonicalReadingContent,
  validateReadingContentPack,
} from "./content/reading-content.js";
import {
  importReadingContent,
  type ReadingImportStore,
} from "./import/reading-content-import.js";
import type {
  VocabularyCatalogItem,
  VocabularyTopicDefinition,
} from "../vocabulary/catalog/vocabulary-catalog.js";

const repositoryRoot = resolve(process.cwd(), "../..");

const loadJson = <T>(...segments: string[]) =>
  JSON.parse(readFileSync(join(repositoryRoot, ...segments), "utf8")) as T;

const nestedQuestions = (passage: ReadingContentPassage) => ({
  create: passage.questions.map((question, questionIndex) => ({
    prompt: question.prompt,
    order: questionIndex + 1,
    reading_options: {
      create: question.options.map((option, optionIndex) => ({
        text: option.text,
        order: optionIndex + 1,
        correct: option.correct,
      })),
    },
  })),
});

const store: ReadingImportStore = {
  async resolveTopics(slugs) {
    const topics = await prisma.vocabulary_topics.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });
    return new Map(topics.map((topic) => [topic.slug, topic.id]));
  },

  transaction(work) {
    return prisma.$transaction(async (transaction) =>
      work({
        async findPassage(slug) {
          return transaction.reading_passages.findUnique({
            where: { slug },
            select: { id: true, status: true },
          });
        },

        async createDraft(passage, topicId) {
          await transaction.reading_passages.create({
            data: {
              slug: passage.slug,
              title: passage.title,
              body: passage.body,
              cefr_level: passage.cefrLevel,
              topic_id: topicId,
              estimated_minutes: passage.estimatedMinutes,
              status: "DRAFT",
              reading_questions: nestedQuestions(passage),
            },
          });
        },

        async replaceDraft(id, passage, topicId) {
          await transaction.reading_questions.deleteMany({
            where: { passage_id: id },
          });
          await transaction.reading_passages.update({
            where: { id },
            data: {
              title: passage.title,
              body: passage.body,
              cefr_level: passage.cefrLevel,
              topic_id: topicId,
              estimated_minutes: passage.estimatedMinutes,
              reading_questions: nestedQuestions(passage),
            },
          });
        },
      })
    );
  },
};

const boundedAudit = (audit: ReadingVocabularyAudit) => ({
  unknownWordCount: audit.unknownWords.length,
  unknownWords: audit.unknownWords.slice(0, 100),
  aboveA1WordCount: audit.aboveA1Words.length,
  aboveA1Words: audit.aboveA1Words.slice(0, 100),
});

const safeErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(
    /postgres(?:ql)?:\/\/[^@\s]+@/giu,
    "postgresql://***@"
  );
};

async function main() {
  const topics = loadJson<VocabularyTopicDefinition[]>(
    "data",
    "vocabulary",
    "topics.json"
  );
  const catalog = loadJson<VocabularyCatalogItem[]>(
    "data",
    "vocabulary",
    "vocabulary-catalog.json"
  );
  const passages = validateReadingContentPack(
    loadCanonicalReadingContent(),
    topics
  );
  const audit = auditReadingVocabulary(passages, catalog);

  console.warn(
    JSON.stringify({
      action: "audit-reading-a1-content",
      ...boundedAudit(audit),
    })
  );

  const summary = await importReadingContent(passages, store);
  console.log(
    JSON.stringify({
      action: "import-reading-a1-drafts",
      ...summary,
    })
  );
}

void main()
  .catch((error: unknown) => {
    console.error(
      JSON.stringify({
        action: "import-reading-a1-drafts",
        error: safeErrorMessage(error),
      })
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
