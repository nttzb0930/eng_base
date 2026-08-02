import type {
  ToeicReadingLearnerQuestion,
  ToeicReadingPracticeAnswerResult,
  ToeicReadingPracticeProgress,
  ToeicReadingPracticeSession,
  ToeicReadingStimulus,
} from "@repo/shared";
import type { Prisma } from "@prisma/client";

import { mapToeicListeningVocabulary } from "../toeic-listening/toeic-listening-vocabulary.mapper";
import { asToeicReadingPart } from "./toeic-reading.mapper";

export const toeicReadingPracticeSessionSelect = {
  id: true,
  test_id: true,
  part: true,
  source_version: true,
  status: true,
  active_question_id: true,
  review_question_ids: true,
  correct_count: true,
  incorrect_count: true,
  updated_at: true,
  completed_at: true,
  toeic_tests: {
    select: {
      id: true,
      title: true,
      status: true,
      source_version: true,
      toeic_test_sets: { select: { title: true } },
      toeic_stimuli: {
        orderBy: [{ part: "asc" as const }, { id: "asc" as const }],
        select: {
          id: true,
          part: true,
          kind: true,
          body: true,
          translation: true,
        },
      },
      toeic_questions: {
        orderBy: { number: "asc" as const },
        select: {
          id: true,
          number: true,
          part: true,
          stimulus_id: true,
          prompt: true,
          translation: true,
          explanation: true,
          toeic_question_vocabulary_cache: {
            select: { vocabulary: true },
          },
          toeic_question_options: {
            orderBy: { label: "asc" as const },
            select: {
              id: true,
              label: true,
              text: true,
              correct: true,
            },
          },
        },
      },
    },
  },
  toeic_reading_practice_answers: {
    orderBy: { answered_at: "asc" as const },
    select: {
      question_id_snapshot: true,
      selected_option_id_snapshot: true,
      correct_option_id_snapshot: true,
      correct_option_label_snapshot: true,
      correct_option_text_snapshot: true,
      explanation_snapshot: true,
      question_translation_snapshot: true,
      correct: true,
    },
  },
} satisfies Prisma.toeic_reading_practice_sessionsSelect;

export type StoredToeicReadingPracticeSession =
  Prisma.toeic_reading_practice_sessionsGetPayload<{
    select: typeof toeicReadingPracticeSessionSelect;
  }>;

type StoredPracticeAnswer =
  StoredToeicReadingPracticeSession["toeic_reading_practice_answers"][number];

type PracticeAnswerContext = {
  part: number;
  correct_count: number;
  incorrect_count: number;
  toeic_tests: {
    toeic_questions: Array<{
      id: number;
      part: number;
      toeic_question_vocabulary_cache?: { vocabulary: unknown } | null;
    }>;
  };
};

export function practiceProgress(
  session: PracticeAnswerContext
): ToeicReadingPracticeProgress {
  const total = session.toeic_tests.toeic_questions.filter(
    (question) => question.part === session.part
  ).length;
  return {
    correct: session.correct_count,
    incorrect: session.incorrect_count,
    answered: session.correct_count + session.incorrect_count,
    total,
  };
}

export function mapToeicReadingPracticeAnswer(
  answer: StoredPracticeAnswer,
  session: PracticeAnswerContext
): ToeicReadingPracticeAnswerResult {
  const questions = session.toeic_tests.toeic_questions.filter(
    (question) => question.part === session.part
  );
  const index = questions.findIndex(
    (question) => question.id === answer.question_id_snapshot
  );

  return {
    questionId: answer.question_id_snapshot,
    selectedOptionId: answer.selected_option_id_snapshot,
    correct: answer.correct,
    correctOption: {
      id: answer.correct_option_id_snapshot,
      label: answer.correct_option_label_snapshot,
      text: answer.correct_option_text_snapshot,
    },
    explanation: answer.explanation_snapshot,
    questionTranslation: answer.question_translation_snapshot,
    answerTranslations: [],
    vocabulary: mapToeicReadingVocabulary(
      session.toeic_tests.toeic_questions.find(
        (question) => question.id === answer.question_id_snapshot
      )?.toeic_question_vocabulary_cache?.vocabulary
    ),
    progress: practiceProgress(session),
    nextQuestionId:
      index >= 0 && index < questions.length - 1
        ? (questions[index + 1]?.id ?? null)
        : null,
  };
}

function mapToeicReadingVocabulary(value: unknown) {
  if (value === undefined || value === null) return [];
  return mapToeicListeningVocabulary(value);
}

export function mapToeicReadingPracticeSession(
  session: StoredToeicReadingPracticeSession
): ToeicReadingPracticeSession {
  const part = asToeicReadingPart(session.part);
  const questions: ToeicReadingLearnerQuestion[] =
    session.toeic_tests.toeic_questions
      .filter((question) => question.part === session.part)
      .map((question) => ({
        id: question.id,
        number: question.number,
        part,
        stimulusId: question.stimulus_id,
        prompt: question.prompt,
        translation: question.translation,
        options: question.toeic_question_options.map(({ id, label, text }) => ({
          id,
          label,
          text,
        })),
      }));
  const stimuli: ToeicReadingStimulus[] = session.toeic_tests.toeic_stimuli
    .filter((stimulus) => stimulus.part === session.part)
    .map((stimulus) => ({
      id: stimulus.id,
      part,
      kind: stimulus.kind,
      body: stimulus.body,
      translation: stimulus.translation,
    }));

  return {
    id: session.id,
    testId: session.test_id,
    part,
    sourceVersion: session.source_version,
    status: session.status === "COMPLETED" ? "COMPLETED" : "ACTIVE",
    activeQuestionId: session.active_question_id,
    reviewQuestionIds: session.review_question_ids,
    content: {
      id: session.toeic_tests.id,
      title: session.toeic_tests.title,
      sourceSetName: session.toeic_tests.toeic_test_sets.title,
      sourceVersion: session.toeic_tests.source_version,
      questionCount: questions.length,
      parts: [{ part, questionCount: questions.length, stimuli, questions }],
    },
    answers: session.toeic_reading_practice_answers.map((answer) =>
      mapToeicReadingPracticeAnswer(answer, session)
    ),
    progress: practiceProgress(session),
    updatedAt: session.updated_at.toISOString(),
    completedAt: session.completed_at?.toISOString() ?? null,
  };
}
