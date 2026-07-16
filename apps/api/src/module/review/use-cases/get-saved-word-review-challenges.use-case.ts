import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { GetSavedVocabularyWordsUseCase } from "../../vocabulary";
import type { ChallengeOption } from "../../courses";
import {
  getBlankedExample,
  getDistractors,
  toReviewSourceItem,
  type ReviewSourceItem,
} from "../../vocabulary";
import {
  ReviewSource,
  SavedWordReviewChallenge,
  SavedWordsReviewMode,
} from "./review-source";

@Injectable()
export class GetSavedWordReviewChallengesUseCase extends ReviewSource {
  constructor(prisma: PrismaService, savedWords: GetSavedVocabularyWordsUseCase) {
    super(prisma, savedWords);
  }

  async execute(userId: string, mode: SavedWordsReviewMode = "all") {
    const savedWords =
      await this.savedWords.execute(userId);

    if (savedWords.length === 0) return [];

    const queueSource =
      mode === "due"
        ? savedWords.filter(
            (savedWord) =>
              this.getVocabularyReviewStatus(savedWord.vocabularyItem).due
          )
        : savedWords;

    if (queueSource.length === 0) return [];

    const savedVocabularyItems = [...queueSource]
      .sort((a, b) => {
        return (
          this.getReviewPriority(b.vocabularyItem) -
          this.getReviewPriority(a.vocabularyItem)
        );
      })
      .slice(0, 20)
      .map((savedWord) => savedWord.vocabularyItem);

    const targetPool = savedVocabularyItems.map(toReviewSourceItem);

    const fallbackPool = await this.prisma.vocabulary_items.findMany({
      where: {
        id: {
          notIn: targetPool.map((item) => item.id),
        },
      },
      take: 400,
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
      savedVocabularyItems.flatMap((item, wordIndex) => {
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

        const coreChallenges: SavedWordReviewChallenge[] = [
          {
            id: selectChallengeId,
            type: "SELECT" as const,
            direction: "EN_TO_VI" as const,
            question: `What does "${item.word}" mean?`,
            vocabularyItem: item,
            challengeOptions: selectOptions,
          },
          {
            id: assistChallengeId,
            type: "ASSIST" as const,
            direction: "VI_TO_EN" as const,
            question: `Which word means "${item.primaryMeaningVi}"?`,
            vocabularyItem: item,
            challengeOptions: assistOptions,
          },
        ];

        const enhancedChallenges: SavedWordReviewChallenge[] = [];

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
