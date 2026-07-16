import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma/prisma.service";
import { auth } from "../../common/auth-context";

const DAY_IN_MS = 86_400_000;
const PRACTICE_CEFR_LEVELS = ["A1", "A2", "B1", "B2"] as const;
type PracticeCefrLevel = typeof PRACTICE_CEFR_LEVELS[number];

export type DashboardLevelProgress = {
  level: PracticeCefrLevel;
  total: number;
  learned: number;
  mastered: number;
  accuracy: number;
};

export type DashboardWeakWord = {
  id: number;
  word: string;
  meaning: string;
  cefrLevel: string;
  wrongCount: number;
  correctCount: number;
  accuracy: number;
};

export type DashboardRecentSession = {
  id: number;
  mode: string;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  createdAt: Date;
};

export type DashboardActivityDay = {
  date: string;
  sessionCount: number;
  wordCount: number;
  accuracy: number;
};

export type DashboardModeAccuracy = {
  mode: string;
  sessionCount: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private getAccuracy(correctCount: number, wrongCount: number) {
    const total = correctCount + wrongCount;
    return total === 0 ? 0 : Math.round((correctCount / total) * 100);
  }

  private emptyLevelProgress(): DashboardLevelProgress[] {
    return PRACTICE_CEFR_LEVELS.map((level) => ({
      level,
      total: 0,
      learned: 0,
      mastered: 0,
      accuracy: 0,
    }));
  }

  private getDayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private getLastSevenDayKeys() {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getTime() - (6 - index) * DAY_IN_MS);
      return this.getDayKey(date);
    });
  }

  async getDashboardStats() {
    const { userId } = await auth();

    if (!userId) {
      return {
        overview: {
          totalVocabulary: 0,
          learnedWords: 0,
          masteredWords: 0,
          dueWords: 0,
          weakWords: 0,
          savedWords: 0,
          totalReviews: 0,
          correctCount: 0,
          wrongCount: 0,
          accuracy: 0,
        },
        levelProgress: this.emptyLevelProgress(),
        topWeakWords: [] as DashboardWeakWord[],
        recentSessions: [] as DashboardRecentSession[],
        activity: [] as DashboardActivityDay[],
        modeAccuracy: [] as DashboardModeAccuracy[],
      };
    }

    const [
      totalVocabulary,
      savedWords,
      vocabularyByLevel,
      progressRows,
      dueWords,
      weakRows,
      recentSessions,
      recentActivitySessions,
      modeRows,
    ] = await Promise.all([
      this.prisma.vocabulary_items.count(),
      this.prisma.user_saved_words.count({
        where: { user_id: userId },
      }),
      this.prisma.vocabulary_items.groupBy({
        by: ["cefr_level"],
        _count: {
          _all: true,
        },
      }),
      this.prisma.user_vocabulary_progress.findMany({
        where: {
          user_id: userId,
          review_count: {
            gt: 0,
          },
        },
        include: {
          vocabulary_items: {
            select: {
              cefr_level: true,
            },
          },
        },
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
      this.prisma.user_vocabulary_progress.findMany({
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
            select: {
              id: true,
              word: true,
              primary_meaning_vi: true,
              cefr_level: true,
            },
          },
        },
        orderBy: [
          {
            wrong_count: "desc",
          },
          {
            updated_at: "asc",
          },
        ],
        take: 8,
      }),
      this.prisma.practice_sessions.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: 5,
      }),
      this.prisma.practice_sessions.findMany({
        where: {
          user_id: userId,
          created_at: {
            gte: new Date(Date.now() - 6 * DAY_IN_MS),
          },
        },
        orderBy: { created_at: "asc" },
      }),
      this.prisma.practice_sessions.groupBy({
        by: ["mode"],
        where: { user_id: userId },
        _count: { _all: true },
        _sum: {
          correct_count: true,
          wrong_count: true,
        },
        orderBy: {
          _count: {
            mode: "desc",
          },
        },
      }),
    ]);

    const correctCount = progressRows.reduce(
      (sum, progress) => sum + progress.correct_count,
      0
    );
    const wrongCount = progressRows.reduce(
      (sum, progress) => sum + progress.wrong_count,
      0
    );
    const totalReviews = progressRows.reduce(
      (sum, progress) => sum + progress.review_count,
      0
    );
    const masteredWords = progressRows.filter(
      (progress) => progress.mastery_level === "mastered"
    ).length;
    const weakWords = progressRows.filter(
      (progress) => progress.wrong_count > 0
    ).length;
    const vocabularyTotalByLevel = new Map(
      vocabularyByLevel.map((row) => [row.cefr_level, row._count._all])
    );

    const levelProgress = PRACTICE_CEFR_LEVELS.map((level) => {
      const levelRows = progressRows.filter(
        (progress) => progress.vocabulary_items.cefr_level === level
      );
      const levelCorrectCount = levelRows.reduce(
        (sum, progress) => sum + progress.correct_count,
        0
      );
      const levelWrongCount = levelRows.reduce(
        (sum, progress) => sum + progress.wrong_count,
        0
      );

      return {
        level,
        total: vocabularyTotalByLevel.get(level) ?? 0,
        learned: levelRows.length,
        mastered: levelRows.filter(
          (progress) => progress.mastery_level === "mastered"
        ).length,
        accuracy: this.getAccuracy(levelCorrectCount, levelWrongCount),
      };
    });

    const topWeakWords = weakRows.map((progress): DashboardWeakWord => ({
      id: progress.vocabulary_items.id,
      word: progress.vocabulary_items.word,
      meaning: progress.vocabulary_items.primary_meaning_vi,
      cefrLevel: progress.vocabulary_items.cefr_level,
      wrongCount: progress.wrong_count,
      correctCount: progress.correct_count,
      accuracy: this.getAccuracy(progress.correct_count, progress.wrong_count),
    }));

    const activityByDay = new Map(
      this.getLastSevenDayKeys().map((date) => [
        date,
        {
          date,
          sessionCount: 0,
          wordCount: 0,
          correctCount: 0,
          wrongCount: 0,
        },
      ])
    );

    for (const session of recentActivitySessions) {
      const day = activityByDay.get(this.getDayKey(session.created_at));
      if (!day) continue;

      day.sessionCount += 1;
      day.correctCount += session.correct_count;
      day.wrongCount += session.wrong_count;
      day.wordCount += session.correct_count + session.wrong_count;
    }

    const activity = Array.from(activityByDay.values()).map((day) => ({
      date: day.date,
      sessionCount: day.sessionCount,
      wordCount: day.wordCount,
      accuracy: this.getAccuracy(day.correctCount, day.wrongCount),
    }));

    const modeAccuracy = modeRows.map((row): DashboardModeAccuracy => {
      const modeCorrectCount = row._sum.correct_count ?? 0;
      const modeWrongCount = row._sum.wrong_count ?? 0;

      return {
        mode: row.mode,
        sessionCount: row._count._all,
        correctCount: modeCorrectCount,
        wrongCount: modeWrongCount,
        accuracy: this.getAccuracy(modeCorrectCount, modeWrongCount),
      };
    });

    return {
      overview: {
        totalVocabulary,
        learnedWords: progressRows.length,
        masteredWords,
        dueWords,
        weakWords,
        savedWords,
        totalReviews,
        correctCount,
        wrongCount,
        accuracy: this.getAccuracy(correctCount, wrongCount),
      },
      levelProgress,
      topWeakWords,
      recentSessions: recentSessions.map((session): DashboardRecentSession => ({
        id: session.id,
        mode: session.mode,
        correctCount: session.correct_count,
        wrongCount: session.wrong_count,
        accuracy: session.accuracy,
        createdAt: session.created_at,
      })),
      activity,
      modeAccuracy,
    };
  }
}
