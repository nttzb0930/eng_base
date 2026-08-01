import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ToeicDictationSubmitPayload,
  ToeicDictationSubmitResult,
} from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { gradeToeicDictation } from "../toeic-dictation-grading.policy";

@Injectable()
export class SubmitToeicDictationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    payload: ToeicDictationSubmitPayload,
  ): Promise<ToeicDictationSubmitResult> {
    const item = await this.prisma.toeic_dictation_items.findFirst({
      where: {
        id: payload.itemId,
        is_active: true,
        toeic_dictation_sets: {
          collection_name: "Đề 2026",
          status: "PUBLISHED",
        },
      },
      select: {
        id: true,
        source_version: true,
        transcript: true,
        translation_vi: true,
      },
    });
    if (!item) throw new NotFoundException("TOEIC Dictation item not found");
    if (item.source_version !== payload.sourceVersion) {
      throw new ConflictException("TOEIC Dictation content version is stale");
    }

    const existing = await this.prisma.toeic_dictation_attempts.findUnique({
      where: {
        user_id_submission_key: {
          user_id: userId,
          submission_key: payload.submissionKey,
        },
      },
      select: {
        id: true,
        item_id: true,
        source_version_snapshot: true,
        typed_text: true,
        words_correct: true,
        total_words: true,
        accuracy: true,
        word_results: true,
        submitted_at: true,
      },
    });
    if (existing) {
      if (
        existing.item_id !== item.id ||
        existing.source_version_snapshot !== payload.sourceVersion
      ) {
        throw new ConflictException("Submission key was already used");
      }
      return {
        attemptId: existing.id,
        itemId: existing.item_id,
        sourceVersion: existing.source_version_snapshot,
        typedText: existing.typed_text,
        wordsCorrect: existing.words_correct,
        totalWords: existing.total_words,
        accuracy: existing.accuracy,
        mastered: existing.accuracy >= 90,
        words: existing.word_results as ToeicDictationSubmitResult["words"],
        transcript: item.transcript,
        translationVi: item.translation_vi,
        submittedAt: existing.submitted_at.toISOString(),
      };
    }

    const grade = gradeToeicDictation(item.transcript, payload.typedText);
    const normalizedText = payload.typedText.trim();
    const attempt = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.toeic_dictation_attempts.create({
        data: {
          user_id: userId,
          item_id: item.id,
          source_version_snapshot: payload.sourceVersion,
          submission_key: payload.submissionKey,
          typed_text: payload.typedText,
          normalized_text: normalizedText,
          words_correct: grade.wordsCorrect,
          total_words: grade.totalWords,
          accuracy: grade.accuracy,
          word_results: grade.words,
        },
        select: { id: true, submitted_at: true },
      });
      const progress = await transaction.toeic_dictation_progress.findUnique({
        where: {
          user_id_item_id: { user_id: userId, item_id: item.id },
        },
        select: { mastered: true, completed_at: true },
      });
      await transaction.toeic_dictation_progress.upsert({
        where: {
          user_id_item_id: { user_id: userId, item_id: item.id },
        },
        create: {
          user_id: userId,
          item_id: item.id,
          latest_accuracy: grade.accuracy,
          words_correct: grade.wordsCorrect,
          total_words: grade.totalWords,
          attempts_count: 1,
          mastered: grade.mastered,
          last_typed_text: payload.typedText,
          last_attempted_at: created.submitted_at,
          completed_at: grade.mastered ? created.submitted_at : null,
        },
        update: {
          latest_accuracy: grade.accuracy,
          words_correct: grade.wordsCorrect,
          total_words: grade.totalWords,
          attempts_count: { increment: 1 },
          mastered: Boolean(progress?.mastered) || grade.mastered,
          last_typed_text: payload.typedText,
          last_attempted_at: created.submitted_at,
          completed_at: grade.mastered
            ? created.submitted_at
            : progress?.completed_at,
        },
      });
      return created;
    });

    return {
      attemptId: attempt.id,
      itemId: item.id,
      sourceVersion: payload.sourceVersion,
      typedText: payload.typedText,
      wordsCorrect: grade.wordsCorrect,
      totalWords: grade.totalWords,
      accuracy: grade.accuracy,
      mastered: grade.mastered,
      words: grade.words,
      transcript: item.transcript,
      translationVi: item.translation_vi,
      submittedAt: attempt.submitted_at.toISOString(),
    };
  }
}
