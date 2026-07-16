import { Injectable } from "@nestjs/common";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma/prisma.service";
import type { ChallengeOption } from "../courses";
import {
  getBlankedExample,
  getDistractors,
  mapVocabularyItem,
  toReviewSourceItem,
  type ReviewSourceItem,
  type UserVocabularyProgress,
  type VocabularyItem,
} from "../vocabulary";

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

import { PracticeSessionResultInputDto } from "./dto/practice-session-result.dto";
import type { Prisma } from "@prisma/client";
import {
  mapPracticeSession,
  mapPracticeSessionDetail,
} from "./practice-session.mapper";

type practice_sessionsFindManyArgs = Prisma.practice_sessionsFindManyArgs;
type practice_sessionsWhereInput = Prisma.practice_sessionsWhereInput;

export const PRACTICE_WORDS_PER_LESSON = 15;
const FALLBACK_POOL_COUNT = 400;
export const PRACTICE_CEFR_LEVELS: PracticeCefrLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
];
const WEAK_WORDS_LIMIT = 20;

@Injectable()
export class PracticeService {
  constructor(private readonly prisma: PrismaService) {}

  async listPracticeSessions(query?: practice_sessionsFindManyArgs) {
    return (await this.prisma.practice_sessions.findMany(query)).map(
      mapPracticeSession
    );
  }

  async countPracticeSessions(where?: practice_sessionsWhereInput) {
    return this.prisma.practice_sessions.count({ where });
  }

  async getPracticeSession(id: number) {
    const session = await this.prisma.practice_sessions.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            vocabulary_items: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Practice session with ID ${id} not found`);
    }

    return mapPracticeSessionDetail(session);
  }

  async deletePracticeSession(id: number) {
    const session = await this.prisma.practice_sessions.delete({
      where: { id },
    });
    return mapPracticeSession(session);
  }

  private shuffle<T>(items: T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
  }

  private isPracticeCefrLevel(value: string): value is PracticeCefrLevel {
    return (PRACTICE_CEFR_LEVELS as readonly string[]).includes(value);
  }

  private normalizePracticeCefrLevel(
    value?: string | null
  ): PracticeCefrLevel | undefined {
    return value && this.isPracticeCefrLevel(value) ? value : undefined;
  }

  private normalizePracticeLessonNumber(value?: string | null): number {
    const parsed = value ? Number(value) : 1;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  }

  private isDue(nextReviewAt: Date | null): boolean {
    return !nextReviewAt || nextReviewAt.getTime() <= Date.now();
  }

  private getWeakPriority(progress: UserVocabularyProgress): number {
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

  // --- Fill Blank Logic ---
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
          orderBy: { order: "asc" },
        },
      },
      skip: (lessonNumber - 1) * PRACTICE_WORDS_PER_LESSON,
      take: PRACTICE_WORDS_PER_LESSON,
    });

    return this.shuffle(eligibleItems);
  }

  async getFillBlankPracticeLevelSummary(userId: string) {
    // Lấy trình độ đã xác nhận của người dùng (mặc định là A1)
    const session = userId
      ? await this.prisma.placement_test_sessions.findUnique({
          where: { user_id: userId },
          select: { confirmed_level: true },
        })
      : null;
    const confirmedLevel = session?.confirmed_level || "A1";
    const confirmedIndex = PRACTICE_CEFR_LEVELS.indexOf(
      confirmedLevel as PracticeCefrLevel
    );

    const rows = [];
    let previousLevelsCompleted = true;

    for (const level of PRACTICE_CEFR_LEVELS) {
      const eligibleItems = await this.prisma.vocabulary_items.findMany({
        where: {
          cefr_level: level,
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
        select: {
          id: true,
        },
      });
      const completedProgress = userId
        ? await this.prisma.user_vocabulary_progress.findMany({
            where: {
              user_id: userId,
              review_count: {
                gt: 0,
              },
              vocabulary_item_id: {
                in: eligibleItems.map((item) => item.id),
              },
            },
            select: {
              vocabulary_item_id: true,
            },
          })
        : [];
      const completedVocabularyIds = new Set(
        completedProgress.map((progress) => progress.vocabulary_item_id)
      );
      const lessons = Math.ceil(
        eligibleItems.length / PRACTICE_WORDS_PER_LESSON
      );

      const levelIndex = PRACTICE_CEFR_LEVELS.indexOf(level);
      const isLevelUnlockedByPlacement = levelIndex <= confirmedIndex;

      let unlockedLessons =
        (isLevelUnlockedByPlacement || previousLevelsCompleted) && lessons > 0
          ? 1
          : 0;

      for (
        let lessonIndex = 0;
        (isLevelUnlockedByPlacement || previousLevelsCompleted) &&
        lessonIndex < lessons - 1;
        lessonIndex += 1
      ) {
        const lessonItems = eligibleItems.slice(
          lessonIndex * PRACTICE_WORDS_PER_LESSON,
          (lessonIndex + 1) * PRACTICE_WORDS_PER_LESSON
        );
        const completed = lessonItems.every((item) =>
          completedVocabularyIds.has(item.id)
        );

        if (!completed) break;
        unlockedLessons = lessonIndex + 2;
      }

      const levelCompleted =
        lessons > 0 &&
        eligibleItems.every((item) => completedVocabularyIds.has(item.id));

      rows.push([
        level,
        {
          words: eligibleItems.length,
          lessons,
          unlockedLessons,
        },
      ] as const);

      previousLevelsCompleted = previousLevelsCompleted && levelCompleted;
    }

    return Object.fromEntries(rows) as Record<
      PracticeCefrLevel,
      { words: number; lessons: number; unlockedLessons: number }
    >;
  }

  async getFillBlankPracticeChallenges(
    userId: string,
    level?: string,
    lesson?: string
  ) {
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

  // --- Listening Practice Logic ---
  private async getEligibleListeningItems(level: PracticeCefrLevel) {
    return this.prisma.vocabulary_items.findMany({
      where: {
        cefr_level: level,
        audio_url: {
          not: null,
        },
      },
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
      },
    });
  }

  async getListeningPracticeLevelSummary(userId: string) {
    // Lấy trình độ đã xác nhận của người dùng (mặc định là A1)
    const session = userId
      ? await this.prisma.placement_test_sessions.findUnique({
          where: { user_id: userId },
          select: { confirmed_level: true },
        })
      : null;
    const confirmedLevel = session?.confirmed_level || "A1";
    const confirmedIndex = PRACTICE_CEFR_LEVELS.indexOf(
      confirmedLevel as PracticeCefrLevel
    );

    const rows = [];
    let previousLevelsCompleted = true;

    for (const level of PRACTICE_CEFR_LEVELS) {
      const eligibleItems = await this.getEligibleListeningItems(level);
      const completedProgress = userId
        ? await this.prisma.user_vocabulary_progress.findMany({
            where: {
              user_id: userId,
              review_count: {
                gt: 0,
              },
              vocabulary_item_id: {
                in: eligibleItems.map((item) => item.id),
              },
            },
            select: {
              vocabulary_item_id: true,
            },
          })
        : [];
      const completedVocabularyIds = new Set(
        completedProgress.map((progress) => progress.vocabulary_item_id)
      );
      const lessons = Math.ceil(
        eligibleItems.length / PRACTICE_WORDS_PER_LESSON
      );

      const levelIndex = PRACTICE_CEFR_LEVELS.indexOf(level);
      const isLevelUnlockedByPlacement = levelIndex <= confirmedIndex;

      let unlockedLessons =
        (isLevelUnlockedByPlacement || previousLevelsCompleted) && lessons > 0
          ? 1
          : 0;

      for (
        let lessonIndex = 0;
        (isLevelUnlockedByPlacement || previousLevelsCompleted) &&
        lessonIndex < lessons - 1;
        lessonIndex += 1
      ) {
        const lessonItems = eligibleItems.slice(
          lessonIndex * PRACTICE_WORDS_PER_LESSON,
          (lessonIndex + 1) * PRACTICE_WORDS_PER_LESSON
        );
        const completed = lessonItems.every((item) =>
          completedVocabularyIds.has(item.id)
        );

        if (!completed) break;
        unlockedLessons = lessonIndex + 2;
      }

      const levelCompleted =
        lessons > 0 &&
        eligibleItems.every((item) => completedVocabularyIds.has(item.id));

      rows.push([
        level,
        {
          words: eligibleItems.length,
          lessons,
          unlockedLessons,
        },
      ] as const);

      previousLevelsCompleted = previousLevelsCompleted && levelCompleted;
    }

    return Object.fromEntries(rows) as Record<
      PracticeCefrLevel,
      { words: number; lessons: number; unlockedLessons: number }
    >;
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

  async getListeningPracticeChallenges(
    userId: string,
    level?: string,
    lesson?: string
  ) {
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

  // --- Dictation Practice Logic ---
  private async getEligibleDictationItems(level: PracticeCefrLevel) {
    return this.prisma.vocabulary_items.findMany({
      where: {
        cefr_level: level,
        audio_url: {
          not: null,
        },
      },
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
      },
    });
  }

  async getDictationPracticeLevelSummary(userId: string) {
    // Lấy trình độ đã xác nhận của người dùng (mặc định là A1)
    const session = userId
      ? await this.prisma.placement_test_sessions.findUnique({
          where: { user_id: userId },
          select: { confirmed_level: true },
        })
      : null;
    const confirmedLevel = session?.confirmed_level || "A1";
    const confirmedIndex = PRACTICE_CEFR_LEVELS.indexOf(
      confirmedLevel as PracticeCefrLevel
    );

    const rows = [];
    let previousLevelsCompleted = true;

    for (const level of PRACTICE_CEFR_LEVELS) {
      const eligibleItems = await this.getEligibleDictationItems(level);
      const completedProgress = userId
        ? await this.prisma.user_vocabulary_progress.findMany({
            where: {
              user_id: userId,
              review_count: {
                gt: 0,
              },
              vocabulary_item_id: {
                in: eligibleItems.map((item) => item.id),
              },
            },
            select: {
              vocabulary_item_id: true,
            },
          })
        : [];
      const completedVocabularyIds = new Set(
        completedProgress.map((progress) => progress.vocabulary_item_id)
      );
      const lessons = Math.ceil(
        eligibleItems.length / PRACTICE_WORDS_PER_LESSON
      );

      const levelIndex = PRACTICE_CEFR_LEVELS.indexOf(level);
      const isLevelUnlockedByPlacement = levelIndex <= confirmedIndex;

      let unlockedLessons =
        (isLevelUnlockedByPlacement || previousLevelsCompleted) && lessons > 0
          ? 1
          : 0;

      for (
        let lessonIndex = 0;
        (isLevelUnlockedByPlacement || previousLevelsCompleted) &&
        lessonIndex < lessons - 1;
        lessonIndex += 1
      ) {
        const lessonItems = eligibleItems.slice(
          lessonIndex * PRACTICE_WORDS_PER_LESSON,
          (lessonIndex + 1) * PRACTICE_WORDS_PER_LESSON
        );
        const completed = lessonItems.every((item) =>
          completedVocabularyIds.has(item.id)
        );

        if (!completed) break;
        unlockedLessons = lessonIndex + 2;
      }

      const levelCompleted =
        lessons > 0 &&
        eligibleItems.every((item) => completedVocabularyIds.has(item.id));

      rows.push([
        level,
        {
          words: eligibleItems.length,
          lessons,
          unlockedLessons,
        },
      ] as const);

      previousLevelsCompleted = previousLevelsCompleted && levelCompleted;
    }

    return Object.fromEntries(rows) as Record<
      PracticeCefrLevel,
      { words: number; lessons: number; unlockedLessons: number }
    >;
  }

  private async getDictationVocabularyItems(
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

  async getDictationPracticeChallenges(
    userId: string,
    level?: string,
    lesson?: string
  ) {
    const normalizedLevel = this.normalizePracticeCefrLevel(level);
    const lessonNumber = this.normalizePracticeLessonNumber(lesson);

    if (!userId) return [];

    const vocabularyItems = (
      await this.getDictationVocabularyItems(
        userId,
        normalizedLevel,
        lessonNumber
      )
    ).map(mapVocabularyItem);

    return vocabularyItems.map(
      (item, itemIndex): DictationPracticeChallenge => ({
        id: itemIndex + 1,
        type: "AUDIO_TO_TEXT",
        direction: "AUDIO_TO_EN",
        question: "Listen and type the English word.",
        vocabularyItem: item,
      })
    );
  }

  // --- Weak Words Practice Logic ---
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
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });
  }

  async getWeakWordsPracticeSummary(userId: string) {
    if (!userId) {
      return {
        total: 0,
        due: 0,
        learning: 0,
        wrong: 0,
      };
    }

    const rows = await this.getWeakVocabularyProgressRows(userId);

    return rows.reduce(
      (summary, row) => ({
        total: summary.total + 1,
        due: summary.due + (this.isDue(row.next_review_at) ? 1 : 0),
        learning: summary.learning + (row.mastery_level === "learning" ? 1 : 0),
        wrong: summary.wrong + (row.wrong_count > 0 ? 1 : 0),
      }),
      {
        total: 0,
        due: 0,
        learning: 0,
        wrong: 0,
      }
    );
  }

  async getWeakWordsPracticeChallenges(userId: string) {
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

  // --- Session Results Logic ---
  async createPracticeSessionResult(
    userId: string,
    { mode, items }: PracticeSessionResultInputDto
  ) {
    if (!userId) throw new Error("Unauthorized.");

    const cleanItems = items.filter((item) => item.vocabularyItemId > 0);
    if (cleanItems.length === 0) return null;

    const correctCount = cleanItems.filter((item) => item.correct).length;
    const wrongCount = cleanItems.length - correctCount;
    const accuracy = Math.round((correctCount / cleanItems.length) * 100);

    const session = await this.prisma.practice_sessions.create({
      data: {
        user_id: userId,
        mode,
        correct_count: correctCount,
        wrong_count: wrongCount,
        accuracy,
        items: {
          create: cleanItems.map((item) => ({
            vocabulary_item_id: item.vocabularyItemId,
            challenge_type: item.challengeType,
            correct: item.correct,
            answer: item.answer,
          })),
        },
      },
    });

    return {
      id: session.id,
      mode: session.mode,
      correctCount: session.correct_count,
      wrongCount: session.wrong_count,
      accuracy: session.accuracy,
      createdAt: session.created_at,
    };
  }
}
