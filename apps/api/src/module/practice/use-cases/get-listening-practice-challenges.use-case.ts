import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import type { ChallengeOption } from "../../courses";
import {
  getDistractors,
  mapVocabularyItem,
  toReviewSourceItem,
  type ReviewSourceItem,
} from "../../vocabulary";
import {
  PracticeSource,
  PracticeCefrLevel,
  PRACTICE_WORDS_PER_LESSON,
  FALLBACK_POOL_COUNT,
} from "./practice-source";

@Injectable()
export class GetListeningPracticeChallengesUseCase extends PracticeSource {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private async getListeningVocabularyItems(
    userId: string,
    level?: PracticeCefrLevel,
    lessonNumber = 1
  ) {
    return this.prisma.vocabulary_items.findMany({
      where: {
        ...(level ? { cefr_level: level } : {}),
        audio_url: {
          not: null,
        },
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
          orderBy: { order: "asc" },
        },
      },
      skip: (lessonNumber - 1) * PRACTICE_WORDS_PER_LESSON,
      take: PRACTICE_WORDS_PER_LESSON,
    });
  }

  async execute(userId: string, level?: string, lesson?: string) {
    const normalizedLevel = this.normalizePracticeCefrLevel(level);
    const lessonNumber = this.normalizePracticeLessonNumber(lesson);

    if (!userId) return [];

    const vocabularyItems = (
      await this.getListeningVocabularyItems(
        userId,
        normalizedLevel,
        lessonNumber
      )
    ).map(mapVocabularyItem);

    if (vocabularyItems.length === 0) return [];

    const targetPool = vocabularyItems.map(toReviewSourceItem);
    const fallbackPool = await this.prisma.vocabulary_items.findMany({
      where: {
        ...(normalizedLevel ? { cefr_level: normalizedLevel } : {}),
        id: {
          notIn: targetPool.map((item) => item.id),
        },
      },
      take: FALLBACK_POOL_COUNT,
    });

    const pool: ReviewSourceItem[] = [
      ...targetPool,
      ...fallbackPool.map((item) => ({
        id: item.id,
        word: item.word,
        pos: item.pos,
        cefrLevel: item.cefr_level,
        primaryMeaningVi: item.primary_meaning_vi,
        meaningVi: item.meaning_vi,
      })),
    ];

    return vocabularyItems.map((item, itemIndex) => {
      const target = toReviewSourceItem(item);
      const distractors = getDistractors(target, pool);
      const challengeId = itemIndex + 1;
      const challengeOptions = this.shuffle([target, ...distractors]).map(
        (option, optionIndex): ChallengeOption => ({
          id: challengeId * 10 + optionIndex,
          challengeId,
          text: option.word,
          correct: option.id === target.id,
          imageSrc: null,
          audioSrc: null,
        })
      );

      return {
        id: challengeId,
        type: "LISTEN_SELECT" as const,
        direction: "AUDIO_TO_EN" as const,
        question: "Listen and choose the correct word.",
        vocabularyItem: item,
        challengeOptions,
      };
    });
  }
}
