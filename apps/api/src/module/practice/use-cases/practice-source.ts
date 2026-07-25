import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import type { ChallengeOption } from "../../courses";
import {
  type UserVocabularyProgress,
  type VocabularyItem,
} from "../../vocabulary";

export type PracticeCefrLevel = "A1" | "A2" | "B1" | "B2";

export type FillBlankPracticeChallenge = {
  id: number;
  type: "FILL_BLANK";
  direction: "CONTEXT_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
  challengeOptions: ChallengeOption[];
};

export type ListeningPracticeChallenge = {
  id: number;
  type: "LISTEN_SELECT";
  direction: "AUDIO_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
  challengeOptions: ChallengeOption[];
};

export type DictationPracticeChallenge = {
  id: number;
  type: "AUDIO_TO_TEXT";
  direction: "AUDIO_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
};

export type WeakWordsPracticeChallenge = {
  id: number;
  type: "SELECT" | "ASSIST" | "LISTEN_SELECT" | "FILL_BLANK";
  direction: "EN_TO_VI" | "VI_TO_EN" | "AUDIO_TO_EN" | "CONTEXT_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
  challengeOptions: ChallengeOption[];
};

export const PRACTICE_WORDS_PER_LESSON = 15;

export const FALLBACK_POOL_COUNT = 400;

export const PRACTICE_CEFR_LEVELS: PracticeCefrLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
];

export const WEAK_WORDS_LIMIT = 20;

export type RandomSource = () => number;

@Injectable()
export class PracticeSource {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly random: RandomSource = Math.random
  ) {}

  protected shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(this.random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }

    return result;
  }

  protected isPracticeCefrLevel(value: string): value is PracticeCefrLevel {
    return (PRACTICE_CEFR_LEVELS as readonly string[]).includes(value);
  }

  protected normalizePracticeCefrLevel(
    value?: string | null
  ): PracticeCefrLevel | undefined {
    return value && this.isPracticeCefrLevel(value) ? value : undefined;
  }

  protected normalizePracticeLessonNumber(value?: string | null): number {
    const parsed = value ? Number(value) : 1;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  }

  protected isDue(nextReviewAt: Date | null): boolean {
    return !nextReviewAt || nextReviewAt.getTime() <= Date.now();
  }

  protected getWeakPriority(progress: UserVocabularyProgress): number {
    const dueScore = this.isDue(progress.nextReviewAt) ? 10_000 : 0;
    const wrongScore = progress.wrongCount * 300;
    const learningScore = progress.masteryLevel === "learning" ? 1_000 : 0;
    const reviewScore = progress.masteryLevel === "review" ? 500 : 0;
    const freshnessPenalty = progress.lastReviewedAt
      ? Math.floor(progress.lastReviewedAt.getTime() / 86_400_000)
      : 0;

    return (
      dueScore + wrongScore + learningScore + reviewScore - freshnessPenalty
    );
  }

  async getPracticeVocabularyItems(
    userId: string,
    level?: PracticeCefrLevel,
    lessonNumber = 1
  ) {
    const eligibleItems = await this.prisma.vocabulary_items.findMany({
      where: {
        ...(level ? { cefr_level: level } : {}),
        OR: [
          {
            example_en: {
              not: null,
            },
          },
          {
            vocabulary_examples: {
              some: {},
            },
          },
        ],
      },
      orderBy: {
        id: "asc",
      },
      include: {
        user_saved_words: {
          where: { user_id: userId },
        },
        user_vocabulary_progress: {
          where: { user_id: userId },
        },
        vocabulary_examples: {
          orderBy: [{ order: "asc" }, { id: "asc" }],
        },
      },
      skip: (lessonNumber - 1) * PRACTICE_WORDS_PER_LESSON,
      take: PRACTICE_WORDS_PER_LESSON,
    });

    return this.shuffle(eligibleItems);
  }
}
