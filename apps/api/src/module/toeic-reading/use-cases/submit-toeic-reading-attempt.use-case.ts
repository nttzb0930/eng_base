import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ToeicReadingSubmissionPayload } from "@repo/shared";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapToeicReadingAttemptResult } from "../toeic-reading.mapper";
import { toeicReadingDraftScope } from "../toeic-reading-draft.mapper";
import { toeicReadingAttemptResultSelect } from "./get-toeic-reading-attempt.use-case";
import {
  createToeicReadingSubmissionFingerprint,
  gradeToeicReadingSubmission,
  ToeicReadingSubmissionError,
} from "./toeic-reading-grading.policy";

type StoredAttempt = Prisma.toeic_reading_attemptsGetPayload<{
  select: typeof toeicReadingAttemptResultSelect;
}>;

@Injectable()
export class SubmitToeicReadingAttemptUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, submission: ToeicReadingSubmissionPayload) {
    const fingerprint = createToeicReadingSubmissionFingerprint(
      submission.testId,
      submission.sourceVersion,
      submission.answers,
      submission.practicePart
    );
    const existing = await this.findExisting(userId, submission.submissionKey);
    if (existing) {
      return this.resolveExisting(
        existing,
        userId,
        submission.testId,
        fingerprint,
        submission.practicePart
      );
    }

    const test = await this.prisma.toeic_tests.findFirst({
      where: { id: submission.testId, status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        source_version: true,
        toeic_questions: {
          orderBy: { number: "asc" },
          select: {
            id: true,
            number: true,
            part: true,
            prompt: true,
            explanation: true,
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
    });
    if (!test) throw new NotFoundException("TOEIC Reading test not found");
    if (test.source_version !== submission.sourceVersion) {
      throw new ConflictException(
        "TOEIC Reading test changed; reload before submitting"
      );
    }

    let graded;
    try {
      graded = gradeToeicReadingSubmission(
        {
          id: test.id,
          sourceVersion: test.source_version,
          questions: test.toeic_questions.map((question) => ({
            id: question.id,
            number: question.number,
            part: question.part,
            prompt: question.prompt,
            explanation: question.explanation,
            options: question.toeic_question_options,
          })),
        },
        submission
      );
    } catch (error) {
      if (error instanceof ToeicReadingSubmissionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    try {
      const created = await this.prisma.$transaction(async (transaction) => {
        const attempt = await transaction.toeic_reading_attempts.create({
          data: {
            user_id: userId,
            test_id: test.id,
            practice_part: submission.practicePart ?? null,
            submission_key: submission.submissionKey,
            submission_fingerprint: fingerprint,
            source_version_snapshot: test.source_version,
            test_title_snapshot: test.title,
            correct_count: graded.correctCount,
            total_count: graded.totalCount,
            accuracy: graded.accuracy,
            toeic_reading_attempt_answers: {
              create: graded.answers.map((answer) => ({
                question_id_snapshot: answer.questionId,
                question_number_snapshot: answer.questionNumber,
                part_snapshot: answer.part,
                selected_option_id_snapshot: answer.selectedOptionId,
                question_prompt_snapshot: answer.question,
                selected_option_label_snapshot: answer.selectedOptionLabel,
                selected_option_text_snapshot: answer.selectedOption,
                correct_option_label_snapshot: answer.correctOptionLabel,
                correct_option_text_snapshot: answer.correctOption,
                explanation_snapshot: answer.explanation,
                correct: answer.correct,
              })),
            },
          },
          select: toeicReadingAttemptResultSelect,
        });
        await transaction.toeic_reading_drafts.deleteMany({
          where: {
            user_id: userId,
            test_id: submission.testId,
            scope: toeicReadingDraftScope(submission.practicePart),
          },
        });
        return attempt;
      });
      return mapToeicReadingAttemptResult(created);
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const winner = await this.findExisting(userId, submission.submissionKey);
      if (!winner) throw error;
      return this.resolveExisting(
        winner,
        userId,
        submission.testId,
        fingerprint,
        submission.practicePart
      );
    }
  }

  private findExisting(userId: string, submissionKey: string) {
    return this.prisma.toeic_reading_attempts.findUnique({
      where: {
        user_id_submission_key: {
          user_id: userId,
          submission_key: submissionKey,
        },
      },
      select: toeicReadingAttemptResultSelect,
    });
  }

  private async resolveExisting(
    existing: StoredAttempt,
    userId: string,
    testId: number,
    fingerprint: string,
    practicePart?: ToeicReadingSubmissionPayload["practicePart"]
  ) {
    if (
      existing.test_id !== testId ||
      existing.submission_fingerprint !== fingerprint
    ) {
      throw new ConflictException(
        "Submission key was already used for different TOEIC answers"
      );
    }
    await this.prisma.toeic_reading_drafts.deleteMany({
      where: {
        user_id: userId,
        test_id: testId,
        scope: toeicReadingDraftScope(practicePart),
      },
    });
    return mapToeicReadingAttemptResult(existing);
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
