import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { VocabularyService } from "../../vocabulary";
import type { ChallengeOption } from "../../courses";
import {
  getBlankedExample,
  getDistractors,
  mapVocabularyItem,
  toReviewSourceItem,
  type ReviewSourceItem,
} from "../../vocabulary";
import {
  type DailyReviewChallenge,
  FALLBACK_POOL_COUNT,
} from "./review-source";
import { DailyReviewSource } from "./daily-review-source";

@Injectable()
export class GetDailyReviewChallengesUseCase extends DailyReviewSource {
  constructor(prisma: PrismaService, vocabularyService: VocabularyService) {
    super(prisma, vocabularyService);
  }

  async execute(userId: string) {
    const candidateIds = await this.getDailyReviewCandidateIds(userId);
    const vocabularyItems = (
      await this.getDailyReviewVocabularyItems(userId, candidateIds.selectedIds)
    ).map(mapVocabularyItem);

    if (vocabularyItems.length === 0) return [];

    const targetPool = vocabularyItems.map(toReviewSourceItem);
    const fallbackPool = await this.prisma.vocabulary_items.findMany({
      where: {
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

    return vocabularyItems.flatMap((item, wordIndex) => {
      const target = toReviewSourceItem(item);
      const distractors = getDistractors(target, pool);

      const selectChallengeId = wordIndex * 10 + 1;
      const assistChallengeId = wordIndex * 10 + 2;
      const listeningChallengeId = wordIndex * 10 + 3;
      const fillBlankChallengeId = wordIndex * 10 + 4;
      const dictationChallengeId = wordIndex * 10 + 5;

      const selectOptions = this.shuffle([target, ...distractors]).map(
        (option, optionIndex): ChallengeOption => ({
          id: selectChallengeId * 10 + optionIndex,
          challengeId: selectChallengeId,
          text: option.primaryMeaningVi,
          correct: option.id === target.id,
          imageSrc: null,
          audioSrc: null,
        })
      );
      const assistOptions = this.shuffle([target, ...distractors]).map(
        (option, optionIndex): ChallengeOption => ({
          id: assistChallengeId * 10 + optionIndex,
          challengeId: assistChallengeId,
          text: option.word,
          correct: option.id === target.id,
          imageSrc: null,
          audioSrc: null,
        })
      );
      const challenges: DailyReviewChallenge[] = [
        {
          id: selectChallengeId,
          type: "SELECT",
          direction: "EN_TO_VI",
          question: `What does "${item.word}" mean?`,
          vocabularyItem: item,
          challengeOptions: selectOptions,
        },
        {
          id: assistChallengeId,
          type: "ASSIST",
          direction: "VI_TO_EN",
          question: `Which word means "${item.primaryMeaningVi}"?`,
          vocabularyItem: item,
          challengeOptions: assistOptions,
        },
      ];

      if (item.audioUrl) {
        challenges.push({
          id: listeningChallengeId,
          type: "LISTEN_SELECT",
          direction: "AUDIO_TO_EN",
          question: "Listen and choose the correct word.",
          vocabularyItem: item,
          challengeOptions: this.shuffle([target, ...distractors]).map(
            (option, optionIndex): ChallengeOption => ({
              id: listeningChallengeId * 10 + optionIndex,
              challengeId: listeningChallengeId,
              text: option.word,
              correct: option.id === target.id,
              imageSrc: null,
              audioSrc: null,
            })
          ),
        });

        challenges.push({
          id: dictationChallengeId,
          type: "AUDIO_TO_TEXT",
          direction: "AUDIO_TO_EN",
          question: "Listen and type the English word.",
          vocabularyItem: item,
          challengeOptions: [],
        });
      }

      const blankedExample = getBlankedExample(item);

      if (blankedExample) {
        challenges.push({
          id: fillBlankChallengeId,
          type: "FILL_BLANK",
          direction: "CONTEXT_TO_EN",
          question: blankedExample,
          vocabularyItem: item,
          challengeOptions: this.shuffle([target, ...distractors]).map(
            (option, optionIndex): ChallengeOption => ({
              id: fillBlankChallengeId * 10 + optionIndex,
              challengeId: fillBlankChallengeId,
              text: option.word,
              correct: option.id === target.id,
              imageSrc: null,
              audioSrc: null,
            })
          ),
        });
      }

      return this.shuffle(challenges).slice(0, 2);
    });
  }
}
