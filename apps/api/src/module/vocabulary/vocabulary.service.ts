import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma/prisma.service";
import {
  mapSavedWord,
  mapVocabularyItem,
} from "./mappers/vocabulary-item.mapper";

export type FlashcardRating = "again" | "good";

type ExistingSchedule = {
  ease_factor: number;
  interval_days: number;
  repetition_count: number;
};

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const DAY_IN_MS = 86_400_000;

@Injectable()
export class VocabularyService {
  constructor(private readonly prisma: PrismaService) {}

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_IN_MS);
  }

  private getExistingSchedule(
    progress: ExistingSchedule | null | undefined
  ): ExistingSchedule {
    return {
      ease_factor: progress?.ease_factor ?? DEFAULT_EASE_FACTOR,
      interval_days: progress?.interval_days ?? 0,
      repetition_count: progress?.repetition_count ?? 0,
    };
  }

  private getMasteryLevel(
    rating: FlashcardRating,
    repetitionCount: number
  ): string {
    if (rating === "again") return "learning";
    if (repetitionCount >= 5) return "mastered";
    if (repetitionCount >= 2) return "review";
    return "learning";
  }

  private getSchedulingUpdate(
    existingProgress: ExistingSchedule | null | undefined,
    rating: FlashcardRating
  ) {
    const current = this.getExistingSchedule(existingProgress);

    if (rating === "again") {
      const easeFactor = Math.max(
        MIN_EASE_FACTOR,
        Number((current.ease_factor - 0.2).toFixed(2))
      );

      return {
        correctIncrement: 0,
        wrongIncrement: 1,
        easeFactor,
        intervalDays: 1,
        repetitionCount: 0,
        masteryLevel: this.getMasteryLevel(rating, 0),
        nextReviewAt: this.addDays(new Date(), 1),
      };
    }

    const repetitionCount = current.repetition_count + 1;
    const intervalDays =
      repetitionCount === 1
        ? 1
        : repetitionCount === 2
          ? 6
          : Math.max(
              1,
              Math.round(current.interval_days * current.ease_factor)
            );

    return {
      correctIncrement: 1,
      wrongIncrement: 0,
      easeFactor: current.ease_factor,
      intervalDays,
      repetitionCount,
      masteryLevel: this.getMasteryLevel(rating, repetitionCount),
      nextReviewAt: this.addDays(new Date(), intervalDays),
    };
  }

  private revalidateVocabularyProgressPaths() {}

  async getSavedVocabularyWords(userId: string) {
    if (!userId) return [];

    const data = await this.prisma.user_saved_words.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      include: {
        vocabulary_items: {
          include: {
            user_vocabulary_progress: {
              where: { user_id: userId },
            },
            vocabulary_examples: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    return data.map((savedWord) => ({
      ...mapSavedWord(savedWord),
      vocabularyItem: mapVocabularyItem(savedWord.vocabulary_items),
    }));
  }

  async toggleSavedWord(userId: string, vocabularyItemId: number) {
    if (!userId) throw new UnauthorizedException("TOKEN_INVALID");

    const vocabularyItem = await this.prisma.vocabulary_items.findUnique({
      where: { id: vocabularyItemId },
    });

    if (!vocabularyItem) {
      throw new NotFoundException("Vocabulary item not found.");
    }

    const existingSavedWord = await this.prisma.user_saved_words.findFirst({
      where: {
        user_id: userId,
        vocabulary_item_id: vocabularyItemId,
      },
    });

    if (existingSavedWord) {
      await this.prisma.user_saved_words.delete({
        where: { id: existingSavedWord.id },
      });

      return { saved: false };
    }

    await this.prisma.user_saved_words.create({
      data: {
        user_id: userId,
        vocabulary_item_id: vocabularyItemId,
      },
    });

    return { saved: true };
  }

  async recordVocabularyReviewResult(
    userId: string,
    vocabularyItemId: number,
    correct: boolean
  ) {
    if (!userId) throw new UnauthorizedException("TOKEN_INVALID");

    const existingProgress =
      await this.prisma.user_vocabulary_progress.findUnique({
        where: {
          user_id_vocabulary_item_id: {
            user_id: userId,
            vocabulary_item_id: vocabularyItemId,
          },
        },
      });

    const rating: FlashcardRating = correct ? "good" : "again";
    const scheduleUpdate = this.getSchedulingUpdate(existingProgress, rating);
    const correctCount =
      (existingProgress?.correct_count ?? 0) + scheduleUpdate.correctIncrement;
    const wrongCount =
      (existingProgress?.wrong_count ?? 0) + scheduleUpdate.wrongIncrement;
    const reviewCount = (existingProgress?.review_count ?? 0) + 1;

    const progress = await this.prisma.user_vocabulary_progress.upsert({
      where: {
        user_id_vocabulary_item_id: {
          user_id: userId,
          vocabulary_item_id: vocabularyItemId,
        },
      },
      create: {
        user_id: userId,
        vocabulary_item_id: vocabularyItemId,
        correct_count: correctCount,
        wrong_count: wrongCount,
        review_count: reviewCount,
        mastery_level: scheduleUpdate.masteryLevel,
        ease_factor: scheduleUpdate.easeFactor,
        interval_days: scheduleUpdate.intervalDays,
        repetition_count: scheduleUpdate.repetitionCount,
        last_reviewed_at: new Date(),
        next_review_at: scheduleUpdate.nextReviewAt,
      },
      update: {
        correct_count: correctCount,
        wrong_count: wrongCount,
        review_count: reviewCount,
        mastery_level: scheduleUpdate.masteryLevel,
        ease_factor: scheduleUpdate.easeFactor,
        interval_days: scheduleUpdate.intervalDays,
        repetition_count: scheduleUpdate.repetitionCount,
        last_reviewed_at: new Date(),
        next_review_at: scheduleUpdate.nextReviewAt,
      },
    });

    this.revalidateVocabularyProgressPaths();

    return {
      id: progress.id,
      vocabularyItemId: progress.vocabulary_item_id,
      correctCount: progress.correct_count,
      wrongCount: progress.wrong_count,
      reviewCount: progress.review_count,
      masteryLevel: progress.mastery_level,
      easeFactor: progress.ease_factor,
      intervalDays: progress.interval_days,
      repetitionCount: progress.repetition_count,
      lastReviewedAt: progress.last_reviewed_at,
      nextReviewAt: progress.next_review_at,
    };
  }

  async recordFlashcardRating(
    userId: string,
    vocabularyItemId: number,
    rating: FlashcardRating
  ) {
    if (!userId) throw new UnauthorizedException("TOKEN_INVALID");

    const existingProgress =
      await this.prisma.user_vocabulary_progress.findUnique({
        where: {
          user_id_vocabulary_item_id: {
            user_id: userId,
            vocabulary_item_id: vocabularyItemId,
          },
        },
      });
    const scheduleUpdate = this.getSchedulingUpdate(existingProgress, rating);
    const correctCount =
      (existingProgress?.correct_count ?? 0) + scheduleUpdate.correctIncrement;
    const wrongCount =
      (existingProgress?.wrong_count ?? 0) + scheduleUpdate.wrongIncrement;
    const reviewCount = (existingProgress?.review_count ?? 0) + 1;

    const progress = await this.prisma.user_vocabulary_progress.upsert({
      where: {
        user_id_vocabulary_item_id: {
          user_id: userId,
          vocabulary_item_id: vocabularyItemId,
        },
      },
      create: {
        user_id: userId,
        vocabulary_item_id: vocabularyItemId,
        correct_count: correctCount,
        wrong_count: wrongCount,
        review_count: reviewCount,
        mastery_level: scheduleUpdate.masteryLevel,
        ease_factor: scheduleUpdate.easeFactor,
        interval_days: scheduleUpdate.intervalDays,
        repetition_count: scheduleUpdate.repetitionCount,
        last_reviewed_at: new Date(),
        next_review_at: scheduleUpdate.nextReviewAt,
      },
      update: {
        correct_count: correctCount,
        wrong_count: wrongCount,
        review_count: reviewCount,
        mastery_level: scheduleUpdate.masteryLevel,
        ease_factor: scheduleUpdate.easeFactor,
        interval_days: scheduleUpdate.intervalDays,
        repetition_count: scheduleUpdate.repetitionCount,
        last_reviewed_at: new Date(),
        next_review_at: scheduleUpdate.nextReviewAt,
      },
    });

    this.revalidateVocabularyProgressPaths();

    return {
      id: progress.id,
      vocabularyItemId: progress.vocabulary_item_id,
      correctCount: progress.correct_count,
      wrongCount: progress.wrong_count,
      reviewCount: progress.review_count,
      masteryLevel: progress.mastery_level,
      easeFactor: progress.ease_factor,
      intervalDays: progress.interval_days,
      repetitionCount: progress.repetition_count,
      lastReviewedAt: progress.last_reviewed_at,
      nextReviewAt: progress.next_review_at,
    };
  }
}
