import type { Prisma, PrismaClient } from "@prisma/client";

import type { ToeicReadingImportStore } from "./toeic-reading-practice.import.js";
import type {
  ToeicPracticeStat,
  ToeicReadingPracticeTest,
} from "./toeic-reading-practice.types.js";

function statsByQuestionId(stats: ToeicPracticeStat[]) {
  return new Map(stats.map((stat) => [stat.sourceItemId, stat]));
}

async function replaceOwnedContent(input: {
  transaction: Prisma.TransactionClient;
  testId: number;
  content: ToeicReadingPracticeTest;
  practiceStats: ToeicPracticeStat[];
}) {
  const { transaction, testId, content } = input;
  await transaction.toeic_media_assets.deleteMany({
    where: { test_id: testId },
  });
  await transaction.toeic_questions.deleteMany({
    where: { test_id: testId },
  });
  await transaction.toeic_stimuli.deleteMany({
    where: { test_id: testId },
  });

  const stimulusIds = new Map<string, number>();
  for (const part of content.parts) {
    for (const stimulus of part.stimuli) {
      const created = await transaction.toeic_stimuli.create({
        data: {
          test_id: testId,
          source_stimulus_id: stimulus.sourceStimulusId,
          part: part.part,
          kind: stimulus.kind,
          body: stimulus.body,
          translation: stimulus.translation,
        },
        select: { id: true },
      });
      stimulusIds.set(stimulus.sourceStimulusId, created.id);
    }
  }

  if (content.media.length > 0) {
    await transaction.toeic_media_assets.createMany({
      data: content.media.map((media) => ({
        test_id: testId,
        source_media_id: media.id,
        source_url: media.sourceUrl,
        storage_path: media.storagePath,
        sha256: media.sha256,
        bytes: media.bytes,
        content_type: media.contentType,
        status: media.status,
      })),
    });
  }

  const stats = statsByQuestionId(input.practiceStats);
  for (const part of content.parts) {
    for (const question of part.questions) {
      const practice = stats.get(question.sourceQuestionId);
      await transaction.toeic_questions.create({
        data: {
          test_id: testId,
          stimulus_id: question.stimulusId
            ? stimulusIds.get(question.stimulusId)
            : null,
          source_question_id: question.sourceQuestionId,
          number: question.sourceNumber,
          part: part.part,
          prompt: question.prompt,
          translation: question.translation,
          explanation: question.explanation,
          difficulty_level: practice?.difficultyLevel ?? null,
          error_rate: practice?.errorRate ?? null,
          total_attempts: practice?.totalAttempts ?? null,
          toeic_question_options: {
            create: question.choices.map((choice) => ({
              label: choice.label,
              text: choice.text,
              correct: choice.correct,
            })),
          },
        },
      });
    }
  }
}

export function createPrismaToeicReadingImportStore(
  prisma: PrismaClient,
  now: () => Date = () => new Date()
): ToeicReadingImportStore {
  return {
    async requireCourseId(courseCode) {
      const course = await prisma.courses.findUnique({
        where: { code: courseCode },
        select: { id: true },
      });
      if (!course) throw new Error("Course toeic-600 does not exist");
      return course.id;
    },

    async importOne({ courseId, content, practiceStats }) {
      const existing = await prisma.toeic_tests.findUnique({
        where: {
          source_source_test_id: {
            source: content.source,
            source_test_id: content.sourceTestId,
          },
        },
        select: { id: true, source_version: true },
      });
      if (existing?.source_version === content.sourceVersion) return "SKIPPED";

      const publishedAt = now();
      await prisma.$transaction(async (transaction) => {
        const testSet = await transaction.toeic_test_sets.upsert({
          where: {
            course_id_source_source_set_id: {
              course_id: courseId,
              source: content.source,
              source_set_id: content.sourceSetId,
            },
          },
          create: {
            course_id: courseId,
            source: content.source,
            source_set_id: content.sourceSetId,
            title: content.sourceSetId,
          },
          update: { title: content.sourceSetId },
          select: { id: true },
        });

        const test = existing
          ? await transaction.toeic_tests.update({
              where: { id: existing.id },
              data: {
                test_set_id: testSet.id,
                source_version: content.sourceVersion,
                title: content.title,
                status: "PUBLISHED",
                published_at: publishedAt,
              },
              select: { id: true },
            })
          : await transaction.toeic_tests.create({
              data: {
                test_set_id: testSet.id,
                source: content.source,
                source_test_id: content.sourceTestId,
                source_version: content.sourceVersion,
                title: content.title,
                status: "PUBLISHED",
                published_at: publishedAt,
              },
              select: { id: true },
            });

        await replaceOwnedContent({
          transaction,
          testId: test.id,
          content,
          practiceStats,
        });
      });
      return existing ? "UPDATED" : "CREATED";
    },
  };
}
