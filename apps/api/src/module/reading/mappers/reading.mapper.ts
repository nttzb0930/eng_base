import {
  type AdminReadingPassage,
  type CreateReadingPassagePayload,
  type ReadingCefrLevel,
  type ReadingAttemptResult,
  type ReadingAttemptSummary,
  type ReadingPassageDetail,
  type ReadingPassageSummary,
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

type ReadingAttemptSummaryRecord = {
  id: number;
  passage_id: number;
  passage_title_snapshot: string;
  correct_count: number;
  total_count: number;
  accuracy: number;
  submitted_at: Date;
};

export function mapReadingAttemptSummary(
  attempt: ReadingAttemptSummaryRecord,
): ReadingAttemptSummary {
  return {
    id: attempt.id,
    passageId: attempt.passage_id,
    passageTitle: attempt.passage_title_snapshot,
    correctCount: attempt.correct_count,
    totalCount: attempt.total_count,
    accuracy: attempt.accuracy,
    submittedAt: attempt.submitted_at.toISOString(),
  };
}

export function mapReadingPassageSummary(passage: {
  id: number;
  slug: string;
  title: string;
  cefr_level: string;
  estimated_minutes: number;
  vocabulary_topics: { title: string } | null;
  _count: { reading_questions: number };
  reading_attempts: ReadingAttemptSummaryRecord[];
}): ReadingPassageSummary {
  return {
    id: passage.id,
    slug: passage.slug,
    title: passage.title,
    cefrLevel: passage.cefr_level as ReadingCefrLevel,
    topicTitle: passage.vocabulary_topics?.title ?? null,
    estimatedMinutes: passage.estimated_minutes,
    questionCount: passage._count.reading_questions,
    latestAttempt: passage.reading_attempts[0]
      ? mapReadingAttemptSummary(passage.reading_attempts[0])
      : null,
  };
}

export function mapReadingPassageDetail(passage: {
  id: number;
  slug: string;
  title: string;
  body: string;
  cefr_level: string;
  estimated_minutes: number;
  vocabulary_topics: { title: string } | null;
  reading_questions: Array<{
    id: number;
    prompt: string;
    order: number;
    reading_options: Array<{ id: number; text: string; order: number }>;
  }>;
}): ReadingPassageDetail {
  return {
    id: passage.id,
    slug: passage.slug,
    title: passage.title,
    body: passage.body,
    cefrLevel: passage.cefr_level as ReadingCefrLevel,
    topicTitle: passage.vocabulary_topics?.title ?? null,
    estimatedMinutes: passage.estimated_minutes,
    questions: passage.reading_questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      order: question.order,
      options: question.reading_options,
    })),
  };
}

export function mapReadingAttemptResult(
  attempt: ReadingAttemptSummaryRecord & {
    reading_attempt_answers: Array<{
      question_id_snapshot: number;
      question_prompt_snapshot: string;
      selected_option_text_snapshot: string;
      correct_option_text_snapshot: string;
      correct: boolean;
    }>;
  },
): ReadingAttemptResult {
  return {
    ...mapReadingAttemptSummary(attempt),
    answers: attempt.reading_attempt_answers.map((answer) => ({
      questionId: answer.question_id_snapshot,
      question: answer.question_prompt_snapshot,
      selectedOption: answer.selected_option_text_snapshot,
      correctOption: answer.correct_option_text_snapshot,
      correct: answer.correct,
    })),
  };
}
