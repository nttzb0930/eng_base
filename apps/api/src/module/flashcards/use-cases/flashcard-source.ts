import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import type {
  UserSavedWord,
  UserVocabularyProgress,
  VocabularyExample,
  VocabularyItem,
} from "../../vocabulary";

export type FlashcardSource = "due" | "saved" | "weak";

export const PRACTICE_CEFR_LEVELS = ["A1", "A2", "B1", "B2"] as const;

export type PracticeCefrLevel = (typeof PRACTICE_CEFR_LEVELS)[number];

export type FlashcardDeckKey = FlashcardSource | PracticeCefrLevel;

export type RawFlashcardVocabularyItem = Awaited<
  ReturnType<FlashcardQuerySource["getFlashcardVocabularyItems"]>
>[number];

export const FLASHCARD_SESSION_LIMIT = 20;

@Injectable()
export class FlashcardQuerySource {
  constructor(protected readonly prisma: PrismaService) {}

  protected isPracticeCefrLevel(value: string): value is PracticeCefrLevel {
    return (PRACTICE_CEFR_LEVELS as readonly string[]).includes(value);
  }

  protected isFlashcardSource(value: string): value is FlashcardSource {
    return value === "due" || value === "saved" || value === "weak";
  }

  protected normalizeFlashcardDeck(value?: string | null): FlashcardDeckKey {
    if (!value) return "due" as const;
    if (this.isFlashcardSource(value)) return value;
    if (this.isPracticeCefrLevel(value)) return value;
    return "due" as const;
  }

  protected shuffle<T>(items: T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
  }

  protected mapSavedWord(
    savedWord: RawFlashcardVocabularyItem["user_saved_words"][number]
  ): UserSavedWord {
    return {
      id: savedWord.id,
      userId: savedWord.user_id,
      vocabularyItemId: savedWord.vocabulary_item_id,
      createdAt: savedWord.created_at,
    };
  }

  protected mapVocabularyProgress(
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

  protected mapVocabularyExample(
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

  protected mapVocabularyItem(
    item: RawFlashcardVocabularyItem
  ): VocabularyItem {
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

  protected async getFlashcardVocabularyItems(
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
}
