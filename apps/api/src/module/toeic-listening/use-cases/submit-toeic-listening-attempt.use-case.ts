import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ToeicListeningSubmissionPayload } from "@repo/shared";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapToeicListeningAttemptResult } from "../toeic-listening.mapper";
import { toeicListeningDraftScope } from "../toeic-listening-draft.mapper";
import { toeicListeningAttemptResultSelect } from "./get-toeic-listening-attempt.use-case";
import {
  createToeicListeningSubmissionFingerprint,
  gradeToeicListeningSubmission,
  ToeicListeningSubmissionError,
} from "./toeic-listening-grading.policy";

@Injectable()
export class SubmitToeicListeningAttemptUseCase {
  constructor(private readonly prisma: PrismaService) {}
  async execute(userId: string, submission: ToeicListeningSubmissionPayload) {
    const fingerprint = createToeicListeningSubmissionFingerprint(
      submission.testId,
      submission.listeningSourceVersion,
      submission.answers,
      submission.practicePart
    );
    const existing = await this.findExisting(userId, submission.submissionKey);
    if (existing)
      return this.resolveExisting(
        existing,
        userId,
        submission.testId,
        fingerprint,
        submission.practicePart
      );
    const test = await this.prisma.toeic_tests.findFirst({
      where: { id: submission.testId, listening_status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        listening_source_version: true,
        toeic_questions: {
          where: { part: { in: [1, 2, 3, 4] } },
          orderBy: { number: "asc" },
          select: {
            id: true,
            number: true,
            part: true,
            prompt: true,
            transcript: true,
            transcript_translation: true,
            explanation: true,
            toeic_media_bindings: {
              select: { media_asset_id: true, role: true, order: true },
            },
            toeic_stimuli: {
              select: {
                id: true,
                transcript: true,
                transcript_translation: true,
                toeic_media_bindings: {
                  select: { media_asset_id: true, role: true, order: true },
                },
              },
            },
            toeic_question_options: {
              orderBy: { label: "asc" },
              select: { id: true, label: true, text: true, correct: true },
            },
          },
        },
      },
    });
    if (!test || !test.listening_source_version)
      throw new NotFoundException("TOEIC Listening test not found");
    if (test.listening_source_version !== submission.listeningSourceVersion)
      throw new ConflictException(
        "TOEIC Listening test changed; reload before submitting"
      );
    let graded;
    try {
      graded = gradeToeicListeningSubmission(
        {
          id: test.id,
          listeningSourceVersion: test.listening_source_version,
          questions: test.toeic_questions.map((q) => ({
            id: q.id,
            number: q.number,
            part: q.part,
            prompt: q.prompt,
            transcript: q.transcript,
            transcriptTranslation: q.transcript_translation,
            explanation: q.explanation,
            audioMediaId:
              q.toeic_media_bindings.find((b) => b.role === "AUDIO")
                ?.media_asset_id ?? null,
            imageMediaIds: q.toeic_media_bindings
              .filter((b) => b.role === "IMAGE")
              .sort((a, b) => a.order - b.order)
              .map((b) => b.media_asset_id),
            stimulus: q.toeic_stimuli
              ? {
                  id: q.toeic_stimuli.id,
                  transcript: q.toeic_stimuli.transcript,
                  transcriptTranslation: q.toeic_stimuli.transcript_translation,
                  audioMediaId:
                    q.toeic_stimuli.toeic_media_bindings.find(
                      (b) => b.role === "AUDIO"
                    )?.media_asset_id ?? null,
                  imageMediaIds: q.toeic_stimuli.toeic_media_bindings
                    .filter((b) => b.role === "IMAGE")
                    .sort((a, b) => a.order - b.order)
                    .map((b) => b.media_asset_id),
                }
              : null,
            options: q.toeic_question_options,
          })),
        },
        submission
      );
    } catch (error) {
      if (error instanceof ToeicListeningSubmissionError)
        throw new BadRequestException(error.message);
      throw error;
    }
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const attempt = await tx.toeic_listening_attempts.create({
          data: {
            user_id: userId,
            test_id: test.id,
            practice_part: submission.practicePart ?? null,
            submission_key: submission.submissionKey,
            submission_fingerprint: fingerprint,
            listening_source_version_snapshot: test.listening_source_version!,
            test_title_snapshot: test.title,
            correct_count: graded.correctCount,
            total_count: graded.totalCount,
            accuracy: graded.accuracy,
            toeic_listening_attempt_answers: {
              create: graded.answers.map((a) => ({
                question_id_snapshot: a.questionId,
                question_number_snapshot: a.questionNumber,
                part_snapshot: a.part,
                selected_option_id_snapshot: a.selectedOptionId,
                question_prompt_snapshot: a.question,
                transcript_snapshot: a.transcript,
                transcript_translation_snapshot: a.transcriptTranslation,
                question_media_snapshot: {
                  audioMediaId: a.audioMediaId,
                  imageMediaIds: a.imageMediaIds,
                },
                stimulus_snapshot: a.stimulus ?? undefined,
                selected_option_label_snapshot: a.selectedOptionLabel,
                selected_option_text_snapshot: a.selectedOption,
                correct_option_label_snapshot: a.correctOptionLabel,
                correct_option_text_snapshot: a.correctOption,
                explanation_snapshot: a.explanation,
                correct: a.correct,
              })),
            },
          },
          select: toeicListeningAttemptResultSelect,
        });
        await tx.toeic_listening_drafts.deleteMany({
          where: {
            user_id: userId,
            test_id: submission.testId,
            scope: toeicListeningDraftScope(submission.practicePart),
          },
        });
        return attempt;
      });
      return mapToeicListeningAttemptResult(created);
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
    return this.prisma.toeic_listening_attempts.findUnique({
      where: {
        user_id_submission_key: {
          user_id: userId,
          submission_key: submissionKey,
        },
      },
      select: toeicListeningAttemptResultSelect,
    });
  }
  private async resolveExisting(
    existing: Prisma.toeic_listening_attemptsGetPayload<{
      select: typeof toeicListeningAttemptResultSelect;
    }>,
    userId: string,
    testId: number,
    fingerprint: string,
    practicePart?: 1 | 2 | 3 | 4
  ) {
    if (
      existing.test_id !== testId ||
      existing.submission_fingerprint !== fingerprint
    )
      throw new ConflictException(
        "Submission key was already used for different TOEIC Listening answers"
      );
    await this.prisma.toeic_listening_drafts.deleteMany({
      where: {
        user_id: userId,
        test_id: testId,
        scope: toeicListeningDraftScope(practicePart),
      },
    });
    return mapToeicListeningAttemptResult(existing);
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
