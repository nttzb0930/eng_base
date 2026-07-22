import { Injectable } from "@nestjs/common";
import {
  CEFR_LEVELS,
  type CefrLevel,
  type CefrLevelProgress,
  type CefrProgressSummary,
} from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { applyCefrUnlockPolicy } from "./cefr-level-progress.policy";

type MutableLevelProgress = Omit<CefrLevelProgress, "unlocked">;

@Injectable()
export class GetCefrLevelProgressUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<CefrProgressSummary> {
    const [userProgress, placementSession] = await Promise.all([
      this.prisma.user_progress.findUnique({
        where: { user_id: userId },
        select: { active_course_id: true },
      }),
      this.prisma.placement_test_sessions.findUnique({
        where: { user_id: userId },
        select: { confirmed_level: true },
      }),
    ]);

    const [vocabularyTotals, vocabularyProgress, units] = await Promise.all([
      this.prisma.vocabulary_items.groupBy({
        by: ["cefr_level"],
        where: { cefr_level: { in: [...CEFR_LEVELS] } },
        _count: { _all: true },
      }),
      this.prisma.user_vocabulary_progress.findMany({
        where: { user_id: userId },
        select: {
          mastery_level: true,
          vocabulary_items: { select: { cefr_level: true } },
        },
      }),
      userProgress?.active_course_id
        ? this.prisma.units.findMany({
            where: {
              course_id: userProgress.active_course_id,
              cefr_level: { not: null },
            },
            select: {
              cefr_level: true,
              lessons: {
                select: {
                  challenges: {
                    select: {
                      challenge_progress: {
                        where: { user_id: userId },
                        select: { completed: true },
                      },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const levels = new Map<CefrLevel, MutableLevelProgress>(
      CEFR_LEVELS.map((level) => [
        level,
        {
          level,
          totalWords: 0,
          learnedWords: 0,
          masteredWords: 0,
          completedLessons: 0,
          totalLessons: 0,
        },
      ])
    );

    for (const total of vocabularyTotals) {
      const level = this.toCefrLevel(total.cefr_level);
      if (level) levels.get(level)!.totalWords = total._count._all;
    }

    for (const progress of vocabularyProgress) {
      const level = this.toCefrLevel(progress.vocabulary_items.cefr_level);
      if (!level) continue;

      const summary = levels.get(level)!;
      summary.learnedWords += 1;
      if (progress.mastery_level === "mastered") summary.masteredWords += 1;
    }

    for (const unit of units) {
      const level = this.toCefrLevel(unit.cefr_level);
      if (!level) continue;

      const summary = levels.get(level)!;
      summary.totalLessons += unit.lessons.length;
      summary.completedLessons += unit.lessons.filter(
        (lesson) =>
          lesson.challenges.length > 0 &&
          lesson.challenges.every(
            (challenge) =>
              challenge.challenge_progress.length > 0 &&
              challenge.challenge_progress.every(
                (progress) => progress.completed
              )
          )
      ).length;
    }

    const orderedLevels = CEFR_LEVELS.map((level) => levels.get(level)!);
    const result = applyCefrUnlockPolicy(
      orderedLevels,
      this.toCefrLevel(placementSession?.confirmed_level)
    );

    return {
      totalWords: result.reduce((sum, level) => sum + level.totalWords, 0),
      levels: result,
    };
  }

  private toCefrLevel(value: string | null | undefined): CefrLevel | null {
    return CEFR_LEVELS.includes(value as CefrLevel)
      ? (value as CefrLevel)
      : null;
  }
}
