import type { Prisma, PrismaClient } from "@prisma/client";

import type {
  ToeicVocabularyCacheImportInput,
  ToeicVocabularyCacheImportStore,
} from "./toeic-vocabulary-cache.import.js";

function recordsFor(
  input: ToeicVocabularyCacheImportInput,
  questions: Array<{ id: number; source_question_id: string }>
) {
  const ids = new Map<string, number>();
  for (const question of questions) {
    if (ids.has(question.source_question_id)) {
      throw new Error(
        `Duplicate source question in selected tests: ${question.source_question_id}`
      );
    }
    ids.set(question.source_question_id, question.id);
  }
  const missing = Object.keys(input.entries).filter(
    (sourceQuestionId) => !ids.has(sourceQuestionId)
  );
  if (missing.length > 0) {
    throw new Error(
      `${missing.length} vocabulary cache questions are missing from TOEIC content`
    );
  }
  return Object.entries(input.entries).map(
    ([sourceQuestionId, vocabulary]) => ({
      question_id: ids.get(sourceQuestionId)!,
      vocabulary: vocabulary as Prisma.InputJsonValue,
      source_inventory_sha256: input.inventorySha256,
    })
  );
}

export function createPrismaToeicVocabularyCacheImportStore(
  prisma: PrismaClient
): ToeicVocabularyCacheImportStore {
  return {
    async replace(input) {
      const questions = await prisma.toeic_questions.findMany({
        where: {
          source_question_id: { in: Object.keys(input.entries) },
          toeic_tests: {
            source: input.source,
            source_test_id: { in: input.sourceTestIds },
          },
        },
        select: { id: true, source_question_id: true },
      });
      const records = recordsFor(input, questions);
      const questionIds = records.map((record) => record.question_id);
      const existingCount = await prisma.toeic_question_vocabulary_cache.count({
        where: {
          question_id: { in: questionIds },
          source_inventory_sha256: input.inventorySha256,
        },
      });
      if (existingCount === records.length) return "SKIPPED";

      await prisma.$transaction(async (transaction) => {
        await transaction.toeic_question_vocabulary_cache.deleteMany({
          where: { question_id: { in: questionIds } },
        });
        await transaction.toeic_question_vocabulary_cache.createMany({
          data: records,
        });
      });
      return "UPDATED";
    },
  };
}
