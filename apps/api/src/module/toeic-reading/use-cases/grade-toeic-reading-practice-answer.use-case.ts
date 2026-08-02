import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ToeicReadingPracticeAnswerPayload,
  ToeicReadingPracticeAnswerResult,
} from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapToeicReadingPracticeAnswer } from "../toeic-reading-practice.mapper";

const answerSelect = {
  question_id_snapshot: true,
  selected_option_id_snapshot: true,
  correct_option_id_snapshot: true,
  correct_option_label_snapshot: true,
  correct_option_text_snapshot: true,
  explanation_snapshot: true,
  question_translation_snapshot: true,
  correct: true,
} as const;

@Injectable()
export class GradeToeicReadingPracticeAnswerUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    sessionId: number,
    payload: ToeicReadingPracticeAnswerPayload
  ): Promise<ToeicReadingPracticeAnswerResult> {
    const session = await this.loadSession(userId, sessionId);
    const requestRetry =
      await this.prisma.toeic_reading_practice_answers.findUnique({
        where: {
          session_id_request_key: {
            session_id: sessionId,
            request_key: payload.requestKey,
          },
        },
        select: answerSelect,
      });
    if (requestRetry) {
      return mapToeicReadingPracticeAnswer(requestRetry, session);
    }

    const existing =
      await this.prisma.toeic_reading_practice_answers.findUnique({
        where: {
          session_id_question_id_snapshot: {
            session_id: sessionId,
            question_id_snapshot: payload.questionId,
          },
        },
        select: answerSelect,
      });
    if (existing) {
      throw new ConflictException(
        "TOEIC Reading practice question was already graded"
      );
    }

    const question = session.toeic_tests.toeic_questions.find(
      (item) => item.id === payload.questionId && item.part === session.part
    );
    if (!question) {
      throw new BadRequestException(
        "Question does not belong to this TOEIC Reading practice"
      );
    }
    const selectedOption = question.toeic_question_options.find(
      (option) => option.id === payload.optionId
    );
    if (!selectedOption) {
      throw new BadRequestException(
        "Option does not belong to this TOEIC Reading question"
      );
    }
    const correctOptions = question.toeic_question_options.filter(
      (option) => option.correct
    );
    if (correctOptions.length !== 1) {
      throw new ConflictException(
        "TOEIC Reading question does not have exactly one correct option"
      );
    }
    const correctOption = correctOptions[0]!;
    const correct = selectedOption.id === correctOption.id;

    try {
      const stored = await this.prisma.$transaction(async (transaction) => {
        const answer = await transaction.toeic_reading_practice_answers.create({
          data: {
            session_id: sessionId,
            request_key: payload.requestKey,
            question_id_snapshot: question.id,
            question_number_snapshot: question.number,
            selected_option_id_snapshot: selectedOption.id,
            selected_option_label_snapshot: selectedOption.label,
            selected_option_text_snapshot: selectedOption.text,
            correct_option_id_snapshot: correctOption.id,
            correct_option_label_snapshot: correctOption.label,
            correct_option_text_snapshot: correctOption.text,
            explanation_snapshot: question.explanation,
            question_translation_snapshot: question.translation,
            correct,
          },
          select: answerSelect,
        });
        const updated =
          await transaction.toeic_reading_practice_sessions.update({
            where: { id: sessionId },
            data: correct
              ? { correct_count: { increment: 1 } }
              : { incorrect_count: { increment: 1 } },
            select: { correct_count: true, incorrect_count: true },
          });
        return { answer, updated };
      });
      return mapToeicReadingPracticeAnswer(stored.answer, {
        ...session,
        correct_count: stored.updated.correct_count,
        incorrect_count: stored.updated.incorrect_count,
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const winnerByRequest =
        await this.prisma.toeic_reading_practice_answers.findUnique({
          where: {
            session_id_request_key: {
              session_id: sessionId,
              request_key: payload.requestKey,
            },
          },
          select: answerSelect,
        });
      if (winnerByRequest) {
        const current = await this.loadSession(userId, sessionId);
        return mapToeicReadingPracticeAnswer(winnerByRequest, current);
      }
      throw new ConflictException(
        "TOEIC Reading practice question was already graded"
      );
    }
  }

  private async loadSession(userId: string, sessionId: number) {
    const session = await this.prisma.toeic_reading_practice_sessions.findFirst(
      {
        where: { id: sessionId, user_id: userId },
        select: {
          id: true,
          part: true,
          source_version: true,
          status: true,
          correct_count: true,
          incorrect_count: true,
          toeic_tests: {
            select: {
              status: true,
              source_version: true,
              toeic_questions: {
                where: { part: { in: [5, 6, 7] } },
                orderBy: { number: "asc" },
                select: {
                  id: true,
                  number: true,
                  part: true,
                  explanation: true,
                  translation: true,
                  toeic_question_options: {
                    orderBy: { label: "asc" },
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
        },
      }
    );
    if (!session) {
      throw new NotFoundException("TOEIC Reading practice not found");
    }
    if (session.status !== "ACTIVE") {
      throw new ConflictException("TOEIC Reading practice is already complete");
    }
    if (
      session.toeic_tests.status !== "PUBLISHED" ||
      session.toeic_tests.source_version !== session.source_version
    ) {
      throw new ConflictException(
        "TOEIC Reading test changed; start a new practice session"
      );
    }
    return session;
  }
}

function isUniqueConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
