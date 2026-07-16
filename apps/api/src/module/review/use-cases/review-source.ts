import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { VocabularyService } from "../../vocabulary";
import type { ChallengeOption } from "../../courses";
import { type VocabularyItem } from "../../vocabulary";

export type DailyReviewChallenge = {
  id: number;
  type: "SELECT" | "ASSIST" | "LISTEN_SELECT" | "FILL_BLANK" | "AUDIO_TO_TEXT";
  direction: "EN_TO_VI" | "VI_TO_EN" | "AUDIO_TO_EN" | "CONTEXT_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
  challengeOptions: ChallengeOption[];
};

export type SavedWordReviewChallenge = {
  id: number;
  type: "SELECT" | "ASSIST" | "LISTEN_SELECT" | "FILL_BLANK";
  direction: "EN_TO_VI" | "VI_TO_EN" | "AUDIO_TO_EN" | "CONTEXT_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
  challengeOptions: ChallengeOption[];
};

export type SavedWordsReviewMode = "all" | "due";

export const FALLBACK_POOL_COUNT = 400;

export const masteryPriority = {
  new: 0,
  learning: 1,
  review: 2,
  mastered: 3,
} as const;

@Injectable()
export class ReviewSource {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly vocabularyService: VocabularyService
  ) {}

  protected shuffle<T>(items: T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
  }

  protected pushUnique(ids: number[], nextIds: number[], limit: number) {
    for (const id of nextIds) {
      if (!ids.includes(id)) ids.push(id);
      if (ids.length >= limit) return;
    }
  }

  protected isDue(nextReviewAt: Date | null): boolean {
    return !nextReviewAt || nextReviewAt.getTime() <= Date.now();
  }

  protected getReviewPriority(item: VocabularyItem): number {
    const progress = item.userVocabularyProgress[0];

    if (!progress) return 10_000;

    const dueScore =
      !progress.nextReviewAt || progress.nextReviewAt.getTime() <= Date.now()
        ? 5_000
        : 0;
    const wrongScore = progress.wrongCount * 100;
    const masteryScore =
      300 -
      (masteryPriority[progress.masteryLevel as keyof typeof masteryPriority] ??
        0) *
        100;

    return dueScore + wrongScore + masteryScore;
  }

  protected getVocabularyReviewStatus(item: VocabularyItem) {
    const progress = item.userVocabularyProgress[0];
    const due =
      !progress?.nextReviewAt || progress.nextReviewAt.getTime() <= Date.now();

    return {
      progress,
      due,
      masteryLevel: progress?.masteryLevel ?? "new",
    };
  }
}
