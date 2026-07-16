import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  PracticeSource,
  PracticeCefrLevel,
  PRACTICE_WORDS_PER_LESSON,
  PRACTICE_CEFR_LEVELS,
} from "./practice-source";

@Injectable()
export class GetListeningPracticeSummaryUseCase extends PracticeSource {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

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

  async execute(userId: string) {
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
}
