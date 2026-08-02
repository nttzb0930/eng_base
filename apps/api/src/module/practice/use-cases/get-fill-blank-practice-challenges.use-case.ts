import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import type { ChallengeOption } from "../../courses";
import { SystemSettingsReader } from "../../settings";
import {
  getBlankedExample,
  getDistractors,
  mapVocabularyItem,
  toReviewSourceItem,
  type ReviewSourceItem,
} from "../../vocabulary";
import { PracticeSource, FALLBACK_POOL_COUNT } from "./practice-source";

@Injectable()
export class GetFillBlankPracticeChallengesUseCase extends PracticeSource {
  constructor(prisma: PrismaService, settings: SystemSettingsReader) {
    super(prisma, settings);
  }

  async execute(userId: string, level?: string, lesson?: string) {
    const normalizedLevel = this.normalizePracticeCefrLevel(level);
    const lessonNumber = this.normalizePracticeLessonNumber(lesson);

    if (!userId) return [];

    const vocabularyItems = (
      await this.getPracticeVocabularyItems(
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

    return vocabularyItems.flatMap((item, itemIndex) => {
      const question = getBlankedExample(item);
      if (!question) return [];

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

      return [
        {
          id: challengeId,
          type: "FILL_BLANK" as const,
          direction: "CONTEXT_TO_EN" as const,
          question,
          vocabularyItem: item,
          challengeOptions,
        },
      ];
    });
  }
}
