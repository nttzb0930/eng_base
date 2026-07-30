import {
  type AdminReadingPassage,
  type CreateReadingPassagePayload,
  type ReadingCefrLevel,
  type ReadingPublicationStatus,
  type ReadingQuestionInput,
  type UpdateReadingPassagePayload,
} from "@repo/shared";
import { Prisma } from "@prisma/client";

export const readingPassageAggregateInclude =
  Prisma.validator<Prisma.reading_passagesInclude>()({
    vocabulary_topics: { select: { title: true } },
    reading_questions: {
      orderBy: { order: "asc" },
      include: {
        reading_options: { orderBy: { order: "asc" } },
      },
    },
  });

export type ReadingPassageAggregate =
  Prisma.reading_passagesGetPayload<{
    include: typeof readingPassageAggregateInclude;
  }>;

export function toReadingQuestionCreateData(
  questions: ReadingQuestionInput[],
) {
  return questions.map((question) => ({
    prompt: question.prompt.trim(),
    order: question.order,
    reading_options: {
      create: question.options.map((option) => ({
        text: option.text.trim(),
        order: option.order,
        correct: option.correct,
      })),
    },
  }));
}

export function toReadingPassageData(
  input: CreateReadingPassagePayload | UpdateReadingPassagePayload,
) {
  return {
    title: input.title.trim(),
    body: input.body.trim(),
    cefr_level: input.cefrLevel,
    topic_id: input.topicId,
    estimated_minutes: input.estimatedMinutes,
  };
}

export function mapAdminReadingPassage(
  passage: ReadingPassageAggregate,
): AdminReadingPassage {
  return {
    id: passage.id,
    slug: passage.slug,
    title: passage.title,
    body: passage.body,
    cefrLevel: passage.cefr_level as ReadingCefrLevel,
    topicId: passage.topic_id,
    topicTitle: passage.vocabulary_topics?.title ?? null,
    estimatedMinutes: passage.estimated_minutes,
    status: passage.status as ReadingPublicationStatus,
    publishedAt: passage.published_at?.toISOString() ?? null,
    createdAt: passage.created_at.toISOString(),
    updatedAt: passage.updated_at.toISOString(),
    questions: passage.reading_questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      order: question.order,
      options: question.reading_options.map((option) => ({
        id: option.id,
        text: option.text,
        order: option.order,
        correct: option.correct,
      })),
    })),
  };
}

export function toReadingContentInput(
  passage: ReadingPassageAggregate,
): CreateReadingPassagePayload {
  return {
    slug: passage.slug,
    title: passage.title,
    body: passage.body,
    cefrLevel: passage.cefr_level as ReadingCefrLevel,
    topicId: passage.topic_id,
    estimatedMinutes: passage.estimated_minutes,
    questions: passage.reading_questions.map((question) => ({
      prompt: question.prompt,
      order: question.order,
      options: question.reading_options.map((option) => ({
        text: option.text,
        order: option.order,
        correct: option.correct,
      })),
    })),
  };
}
