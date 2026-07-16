import { UnauthorizedException } from "@nestjs/common";
import { Prisma, type user_vocabulary_progress } from "@prisma/client";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { getVocabularyReviewSchedule, type FlashcardRating } from "./vocabulary-review-schedule";

export async function recordVocabularyProgress(
  prisma: PrismaService,
  userId: string,
  vocabularyItemId: number,
  rating: FlashcardRating
) {
  if (!userId) throw new UnauthorizedException("TOKEN_INVALID");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${userId}:${vocabularyItemId}`}, 0))`;
    const existing = await tx.user_vocabulary_progress.findUnique({
      where: { user_id_vocabulary_item_id: {
        user_id: userId, vocabulary_item_id: vocabularyItemId,
      } },
    });
    const now = new Date();
    const schedule = getVocabularyReviewSchedule(existing, rating, now);
    const progress = await tx.user_vocabulary_progress.upsert({
      where: { user_id_vocabulary_item_id: {
        user_id: userId, vocabulary_item_id: vocabularyItemId,
      } },
      create: {
        user_id: userId, vocabulary_item_id: vocabularyItemId,
        correct_count: schedule.correctIncrement,
        wrong_count: schedule.wrongIncrement, review_count: 1,
        mastery_level: schedule.masteryLevel, ease_factor: schedule.easeFactor,
        interval_days: schedule.intervalDays,
        repetition_count: schedule.repetitionCount,
        last_reviewed_at: now, next_review_at: schedule.nextReviewAt,
      },
      update: {
        correct_count: { increment: schedule.correctIncrement },
        wrong_count: { increment: schedule.wrongIncrement },
        review_count: { increment: 1 },
        mastery_level: schedule.masteryLevel, ease_factor: schedule.easeFactor,
        interval_days: schedule.intervalDays,
        repetition_count: schedule.repetitionCount,
        last_reviewed_at: now, next_review_at: schedule.nextReviewAt,
      },
    });
    return mapResult(progress);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

function mapResult(progress: user_vocabulary_progress) {
  return {
    id: progress.id, vocabularyItemId: progress.vocabulary_item_id,
    correctCount: progress.correct_count, wrongCount: progress.wrong_count,
    reviewCount: progress.review_count, masteryLevel: progress.mastery_level,
    easeFactor: progress.ease_factor, intervalDays: progress.interval_days,
    repetitionCount: progress.repetition_count,
    lastReviewedAt: progress.last_reviewed_at,
    nextReviewAt: progress.next_review_at,
  };
}
