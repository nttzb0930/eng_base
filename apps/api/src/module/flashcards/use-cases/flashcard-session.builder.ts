import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import type {
  UserSavedWord,
  UserVocabularyProgress,
  VocabularyExample,
  VocabularyItem,
} from "../../vocabulary";

export type FlashcardSource = "due" | "saved" | "weak";
const PRACTICE_CEFR_LEVELS = ["A1", "A2", "B1", "B2"] as const;
type PracticeCefrLevel = (typeof PRACTICE_CEFR_LEVELS)[number];
export type FlashcardDeckKey = FlashcardSource | PracticeCefrLevel;

type RawFlashcardVocabularyItem = Awaited<
  ReturnType<FlashcardSessionBuilder["getFlashcardVocabularyItems"]>
>[number];

const FLASHCARD_SESSION_LIMIT = 20;

@Injectable()
export class FlashcardSessionBuilder {
  constructor(private readonly prisma: PrismaService) {}

  private isPracticeCefrLevel(value: string): value is PracticeCefrLevel {
    return (PRACTICE_CEFR_LEVELS as readonly string[]).includes(value);
  }

  private isFlashcardSource(value: string): value is FlashcardSource {
    return value === "due" || value === "saved" || value === "weak";
  }

  private normalizeFlashcardDeck(value?: string | null): FlashcardDeckKey {
    if (!value) return "due" as const;
    if (this.isFlashcardSource(value)) return value;
    if (this.isPracticeCefrLevel(value)) return value;
    return "due" as const;
  }

  private shuffle<T>(items: T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
  }

  private mapSavedWord(
    savedWord: RawFlashcardVocabularyItem["user_saved_words"][number]
  ): UserSavedWord {
    return {
      id: savedWord.id,
      userId: savedWord.user_id,
      vocabularyItemId: savedWord.vocabulary_item_id,
      createdAt: savedWord.created_at,
    };
  }

  private mapVocabularyProgress(
    progress: RawFlashcardVocabularyItem["user_vocabulary_progress"][number]
  ): UserVocabularyProgress {
    return {
      id: progress.id,
      userId: progress.user_id,
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
      createdAt: progress.created_at,
      updatedAt: progress.updated_at,
    };
  }

  private mapVocabularyExample(
    example: RawFlashcardVocabularyItem["vocabulary_examples"][number]
  ): VocabularyExample {
    return {
      id: example.id,
      vocabularyItemId: example.vocabulary_item_id,
      exampleEn: example.example_en,
      exampleVi: example.example_vi,
      source: example.source,
      order: example.order,
      createdAt: example.created_at,
    };
  }

  private mapVocabularyItem(item: RawFlashcardVocabularyItem): VocabularyItem {
    return {
      id: item.id,
      word: item.word,
      normalizedWord: item.normalized_word,
      pos: item.pos,
      posVi: item.pos_vi,
      cefrLevel: item.cefr_level,
      phonetic: item.phonetic,
      phoneticSource: item.phonetic_source,
      audioUrl: item.audio_url,
      audioSource: item.audio_source,
      exampleEn: item.example_en,
      exampleVi: item.example_vi,
      exampleSource: item.example_source,
      meaningVi: item.meaning_vi,
      primaryMeaningVi: item.primary_meaning_vi,
      source: item.source,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      userSavedWords: item.user_saved_words.map((x) => this.mapSavedWord(x)),
      userVocabularyProgress: item.user_vocabulary_progress.map((x) =>
        this.mapVocabularyProgress(x)
      ),
      vocabularyExamples: item.vocabulary_examples.map((x) =>
        this.mapVocabularyExample(x)
      ),
    };
  }

  private async getFlashcardVocabularyItems(
    userId: string,
    deck: FlashcardDeckKey
  ) {
    return this.prisma.vocabulary_items.findMany({
      where: {
        ...(this.isPracticeCefrLevel(deck)
          ? {
              cefr_level: deck,
            }
          : {}),
        ...(deck === "saved"
          ? {
              user_saved_words: {
                some: {
                  user_id: userId,
                },
              },
            }
          : {}),
        ...(deck === "due"
          ? {
              user_vocabulary_progress: {
                some: {
                  user_id: userId,
                  review_count: {
                    gt: 0,
                  },
                  OR: [
                    {
                      next_review_at: null,
                    },
                    {
                      next_review_at: {
                        lte: new Date(),
                      },
                    },
                  ],
                },
              },
            }
          : {}),
        ...(deck === "weak"
          ? {
              user_vocabulary_progress: {
                some: {
                  user_id: userId,
                  review_count: {
                    gt: 0,
                  },
                  wrong_count: {
                    gt: 0,
                  },
                },
              },
            }
          : {}),
      },
      include: {
        user_saved_words: {
          where: { user_id: userId },
        },
        user_vocabulary_progress: {
          where: { user_id: userId },
        },
        vocabulary_examples: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: {
        id: "asc",
      },
      take: this.isPracticeCefrLevel(deck) ? 300 : 200,
    });
  }

  async getFlashcardDeckSummary(userId: string) {
    if (!userId) {
      return {
        due: 0,
        saved: 0,
        weak: 0,
        levels: Object.fromEntries(
          PRACTICE_CEFR_LEVELS.map((level) => [level, 0])
        ) as Record<PracticeCefrLevel, number>,
      };
    }

    const [saved, due, weak, ...levelCounts] = await Promise.all([
      this.prisma.user_saved_words.count({
        where: { user_id: userId },
      }),
      this.prisma.user_vocabulary_progress.count({
        where: {
          user_id: userId,
          review_count: {
            gt: 0,
          },
          OR: [
            {
              next_review_at: null,
            },
            {
              next_review_at: {
                lte: new Date(),
              },
            },
          ],
        },
      }),
      this.prisma.user_vocabulary_progress.count({
        where: {
          user_id: userId,
          review_count: {
            gt: 0,
          },
          wrong_count: {
            gt: 0,
          },
        },
      }),
      ...PRACTICE_CEFR_LEVELS.map((level) =>
        this.prisma.vocabulary_items.count({
          where: { cefr_level: level },
        })
      ),
    ]);

    return {
      due,
      saved,
      weak,
      levels: Object.fromEntries(
        PRACTICE_CEFR_LEVELS.map((level, index) => [level, levelCounts[index]])
      ) as Record<PracticeCefrLevel, number>,
    };
  }

  async getFlashcardSessionItems(userId: string, deckValue?: string) {
    if (!userId) return [];

    const deck = this.normalizeFlashcardDeck(deckValue);
    const items = (await this.getFlashcardVocabularyItems(userId, deck)).map(
      (x) => this.mapVocabularyItem(x)
    );

    if (deck === "due") {
      return items
        .sort((a, b) => {
          const aProgress = a.userVocabularyProgress[0];
          const bProgress = b.userVocabularyProgress[0];
          const aTime = aProgress?.nextReviewAt?.getTime() ?? 0;
          const bTime = bProgress?.nextReviewAt?.getTime() ?? 0;

          return aTime - bTime;
        })
        .slice(0, FLASHCARD_SESSION_LIMIT);
    }

    if (deck === "weak") {
      return items
        .sort((a, b) => {
          const aProgress = a.userVocabularyProgress[0];
          const bProgress = b.userVocabularyProgress[0];

          return (bProgress?.wrongCount ?? 0) - (aProgress?.wrongCount ?? 0);
        })
        .slice(0, FLASHCARD_SESSION_LIMIT);
    }

    return this.shuffle(items).slice(0, FLASHCARD_SESSION_LIMIT);
  }
}
