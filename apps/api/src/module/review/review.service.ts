import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma/prisma.service";
import { VocabularyService } from "../vocabulary/vocabulary.service";
import { auth } from "../auth";
import type {
  ChallengeOption,
  VocabularyItem,
} from "../courses";
import { mapVocabularyItem } from "../vocabulary/vocabulary-item.mapper";
import {
  getBlankedExample,
  getDistractors,
  toReviewSourceItem,
  type ReviewSourceItem,
} from "../vocabulary/vocabulary-challenge.builder";

export type DailyReviewChallenge = {
  id: number;
  type:
    | "SELECT"
    | "ASSIST"
    | "LISTEN_SELECT"
    | "FILL_BLANK"
    | "AUDIO_TO_TEXT";
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

const FALLBACK_POOL_COUNT = 400;

const masteryPriority = {
  new: 0,
  learning: 1,
  review: 2,
  mastered: 3,
} as const;

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vocabularyService: VocabularyService
  ) {}

  private shuffle<T>(items: T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
  }

  private pushUnique(ids: number[], nextIds: number[], limit: number) {
    for (const id of nextIds) {
      if (!ids.includes(id)) ids.push(id);
      if (ids.length >= limit) return;
    }
  }

  private isDue(nextReviewAt: Date | null): boolean {
    return !nextReviewAt || nextReviewAt.getTime() <= Date.now();
  }

  private getReviewPriority(item: VocabularyItem): number {
    const progress = item.userVocabularyProgress[0];

    if (!progress) return 10_000;

    const dueScore =
      !progress.nextReviewAt || progress.nextReviewAt.getTime() <= Date.now()
        ? 5_000
        : 0;
    const wrongScore = progress.wrongCount * 100;
    const masteryScore =
      300 -
      (masteryPriority[
        progress.masteryLevel as keyof typeof masteryPriority
      ] ?? 0) *
        100;

    return dueScore + wrongScore + masteryScore;
  }

  private getVocabularyReviewStatus(item: VocabularyItem) {
    const progress = item.userVocabularyProgress[0];
    const due =
      !progress?.nextReviewAt || progress.nextReviewAt.getTime() <= Date.now();

    return {
      progress,
      due,
      masteryLevel: progress?.masteryLevel ?? "new",
    };
  }

  // --- Daily Review logic ---
  private async getDailyReviewVocabularyItems(
    userId: string,
    selectedIds: number[]
  ) {
    if (selectedIds.length === 0) return [];

    const items = await this.prisma.vocabulary_items.findMany({
      where: {
        id: {
          in: selectedIds,
        },
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
    });

    return selectedIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  private async getDailyReviewCandidateIds(userId: string) {
    const progress = await this.prisma.user_progress.findUnique({
      where: { user_id: userId },
      select: { intensity: true },
    });
    const intensity = progress?.intensity || "standard";
    const limit =
      intensity === "relaxed"
        ? 5
        : intensity === "standard"
          ? 15
          : intensity === "accelerated"
            ? 30
            : intensity === "intensive"
              ? 50
              : 15;

    const [dueRows, weakRows, savedRows, learnedRows] = await Promise.all([
      this.prisma.user_vocabulary_progress.findMany({
        where: {
          user_id: userId,
          review_count: { gt: 0 },
          OR: [
            { next_review_at: null },
            { next_review_at: { lte: new Date() } },
          ],
        },
        orderBy: [{ next_review_at: "asc" }, { wrong_count: "desc" }],
        select: { vocabulary_item_id: true },
        take: limit,
      }),
      this.prisma.user_vocabulary_progress.findMany({
        where: {
          user_id: userId,
          review_count: { gt: 0 },
          wrong_count: { gt: 0 },
        },
        orderBy: [{ wrong_count: "desc" }, { updated_at: "asc" }],
        select: { vocabulary_item_id: true },
        take: limit,
      }),
      this.prisma.user_saved_words.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        select: { vocabulary_item_id: true },
        take: limit,
      }),
      this.prisma.user_vocabulary_progress.findMany({
        where: {
          user_id: userId,
          review_count: { gt: 0 },
        },
        orderBy: { updated_at: "desc" },
        select: { vocabulary_item_id: true },
        take: limit,
      }),
    ]);

    const selectedIds: number[] = [];

    this.pushUnique(
      selectedIds,
      dueRows.map((row) => row.vocabulary_item_id),
      limit
    );
    this.pushUnique(
      selectedIds,
      weakRows.map((row) => row.vocabulary_item_id),
      limit
    );
    this.pushUnique(
      selectedIds,
      savedRows.map((row) => row.vocabulary_item_id),
      limit
    );
    this.pushUnique(
      selectedIds,
      learnedRows.map((row) => row.vocabulary_item_id),
      limit
    );

    return {
      selectedIds,
      dueCount: dueRows.length,
      weakCount: weakRows.length,
      savedCount: savedRows.length,
    };
  }

  async getDailyReviewSummary() {
    const { userId } = await auth();

    if (!userId) {
      return {
        total: 0,
        due: 0,
        weak: 0,
        saved: 0,
      };
    }

    const candidateIds = await this.getDailyReviewCandidateIds(userId);

    return {
      total: candidateIds.selectedIds.length,
      due: candidateIds.dueCount,
      weak: candidateIds.weakCount,
      saved: candidateIds.savedCount,
    };
  }

  async getDailyReviewChallenges() {
    const { userId } = await auth();

    if (!userId) return [];

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

  // --- Saved Words Review logic ---
  async getSavedWordsReviewSummary() {
    const savedWords = await this.vocabularyService.getSavedVocabularyWords();

    return savedWords.reduce(
      (summary, savedWord) => {
        const status = this.getVocabularyReviewStatus(savedWord.vocabularyItem);

        return {
          total: summary.total + 1,
          due: summary.due + (status.due ? 1 : 0),
          new: summary.new + (status.masteryLevel === "new" ? 1 : 0),
          learning:
            summary.learning + (status.masteryLevel === "learning" ? 1 : 0),
          review: summary.review + (status.masteryLevel === "review" ? 1 : 0),
          mastered:
            summary.mastered + (status.masteryLevel === "mastered" ? 1 : 0),
        };
      },
      {
        total: 0,
        due: 0,
        new: 0,
        learning: 0,
        review: 0,
        mastered: 0,
      }
    );
  }

  async getSavedWordReviewChallenges(mode: SavedWordsReviewMode = "all") {
    const savedWords = await this.vocabularyService.getSavedVocabularyWords();

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
