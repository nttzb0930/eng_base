import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ReadingSubmissionPayload } from "@repo/shared";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapReadingAttemptResult } from "../mappers/reading.mapper";
import {
  createReadingSubmissionFingerprint,
  gradeReadingSubmission,
  ReadingSubmissionError,
} from "./reading-grading.policy";

const readingAttemptResultSelect = {
  id: true,
  passage_id: true,
  submission_fingerprint: true,
  passage_title_snapshot: true,
  correct_count: true,
  total_count: true,
  accuracy: true,
  submitted_at: true,
  reading_attempt_answers: {
    orderBy: { question_id_snapshot: "asc" as const },
    select: {
      question_id_snapshot: true,
      question_prompt_snapshot: true,
      selected_option_text_snapshot: true,
      correct_option_text_snapshot: true,
      correct: true,
    },
  },
};

type StoredAttempt = Prisma.reading_attemptsGetPayload<{
  select: typeof readingAttemptResultSelect;
}>;

@Injectable()
export class SubmitReadingAttemptUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    passageId: number,
    submission: ReadingSubmissionPayload,
  ) {
    const fingerprint = createReadingSubmissionFingerprint(
      passageId,
      submission.answers,
    );
    const existing = await this.findExisting(userId, submission.submissionKey);
    if (existing) {
      return this.resolveExisting(existing, passageId, fingerprint);
    }

    const passage = await this.prisma.reading_passages.findFirst({
      where: { id: passageId, status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        reading_questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            prompt: true,
            order: true,
            reading_options: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                text: true,
                order: true,
                correct: true,
              },
            },
          },
        },
      },
    });
    if (!passage) throw new NotFoundException("Reading passage not found");

    let graded;
    try {
      graded = gradeReadingSubmission(
        {
          id: passage.id,
          questions: passage.reading_questions.map((question) => ({
            id: question.id,
            prompt: question.prompt,
            order: question.order,
            options: question.reading_options,
          })),
        },
        submission,
      );
    } catch (error) {
      if (error instanceof ReadingSubmissionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    try {
      const created = await this.prisma.$transaction((transaction) =>
        transaction.reading_attempts.create({
          data: {
            user_id: userId,
            passage_id: passageId,
            submission_key: submission.submissionKey,
            submission_fingerprint: fingerprint,
            passage_title_snapshot: passage.title,
            correct_count: graded.correctCount,
            total_count: graded.totalCount,
            accuracy: graded.accuracy,
            reading_attempt_answers: {
              create: graded.answers.map((answer) => ({
                question_id_snapshot: answer.questionId,
                selected_option_id_snapshot: answer.selectedOptionId,
                question_prompt_snapshot: answer.question,
                selected_option_text_snapshot: answer.selectedOption,
                correct_option_text_snapshot: answer.correctOption,
                correct: answer.correct,
              })),
            },
          },
          select: readingAttemptResultSelect,
        }),
      );
      return mapReadingAttemptResult(created);
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const winner = await this.findExisting(
        userId,
        submission.submissionKey,
      );
      if (!winner) throw error;
      return this.resolveExisting(winner, passageId, fingerprint);
    }
  }

  private findExisting(userId: string, submissionKey: string) {
    return this.prisma.reading_attempts.findUnique({
      where: {
        user_id_submission_key: {
          user_id: userId,
          submission_key: submissionKey,
        },
      },
      select: readingAttemptResultSelect,
    });
  }

  private resolveExisting(
    existing: StoredAttempt,
    passageId: number,
    fingerprint: string,
  ) {
    if (
      existing.passage_id !== passageId ||
      existing.submission_fingerprint !== fingerprint
    ) {
      throw new ConflictException(
        "Submission key was already used for different answers",
      );
    }
    return mapReadingAttemptResult(existing);
  }

  private isUniqueConflict(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}
