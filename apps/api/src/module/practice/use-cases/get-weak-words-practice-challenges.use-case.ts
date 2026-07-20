import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import type { ChallengeOption } from "../../courses";
import {
  getBlankedExample,
  getDistractors,
  mapVocabularyItem,
  toReviewSourceItem,
  type ReviewSourceItem,
} from "../../vocabulary";
import {
  PracticeSource,
  WeakWordsPracticeChallenge,
  FALLBACK_POOL_COUNT,
  WEAK_WORDS_LIMIT,
} from "./practice-source";

@Injectable()
export class GetWeakWordsPracticeChallengesUseCase extends PracticeSource {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async getWeakVocabularyProgressRows(userId: string) {
    return this.prisma.user_vocabulary_progress.findMany({
      where: {
        user_id: userId,
        review_count: {
          gt: 0,
        },
        wrong_count: {
          gt: 0,
        },
      },
      include: {
        vocabulary_items: {
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
        },
      },
    });
  }

  async execute(userId: string) {
    if (!userId) return [];

    const progressRows = await this.getWeakVocabularyProgressRows(userId);

    const vocabularyItems = progressRows
      .map((row) => mapVocabularyItem(row.vocabulary_items))
      .sort((a, b) => {
        const aProgress = a.userVocabularyProgress[0];
        const bProgress = b.userVocabularyProgress[0];

        if (!aProgress || !bProgress) return 0;

        return (
          this.getWeakPriority(bProgress) - this.getWeakPriority(aProgress)
        );
      })
      .slice(0, WEAK_WORDS_LIMIT);

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

    return this.shuffle(
      vocabularyItems.flatMap((item, wordIndex) => {
        const target = toReviewSourceItem(item);
        const distractors = getDistractors(target, pool);

        const selectChallengeId = wordIndex * 4 + 1;
        const assistChallengeId = wordIndex * 4 + 2;
        const listeningChallengeId = wordIndex * 4 + 3;
        const fillBlankChallengeId = wordIndex * 4 + 4;

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

        const coreChallenges: WeakWordsPracticeChallenge[] = [
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

        const enhancedChallenges: WeakWordsPracticeChallenge[] = [];

        if (item.audioUrl) {
          const listeningOptions = this.shuffle([target, ...distractors]).map(
            (option, optionIndex): ChallengeOption => ({
              id: listeningChallengeId * 10 + optionIndex,
              challengeId: listeningChallengeId,
              text: option.word,
              correct: option.id === target.id,
              imageSrc: null,
              audioSrc: null,
            })
          );

          enhancedChallenges.push({
            id: listeningChallengeId,
            type: "LISTEN_SELECT",
            direction: "AUDIO_TO_EN",
            question: "Listen and choose the correct word.",
            vocabularyItem: item,
            challengeOptions: listeningOptions,
          });
        }

        const blankedExample = getBlankedExample(item);

        if (blankedExample) {
          const fillBlankOptions = this.shuffle([target, ...distractors]).map(
            (option, optionIndex): ChallengeOption => ({
              id: fillBlankChallengeId * 10 + optionIndex,
              challengeId: fillBlankChallengeId,
              text: option.word,
              correct: option.id === target.id,
              imageSrc: null,
              audioSrc: null,
            })
          );

          enhancedChallenges.push({
            id: fillBlankChallengeId,
            type: "FILL_BLANK",
            direction: "CONTEXT_TO_EN",
            question: blankedExample,
            vocabularyItem: item,
            challengeOptions: fillBlankOptions,
          });
        }

        const selectedEnhancedChallenge = this.shuffle(enhancedChallenges)[0];

        return selectedEnhancedChallenge
          ? [...coreChallenges, selectedEnhancedChallenge]
          : coreChallenges;
      })
    );
  }
}
