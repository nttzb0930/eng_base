import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  CourseLearningMapper,
  type LessonWithChallenges,
  type UnitRecord,
} from "./course-learning.mapper";
import { GetUserProgressUseCase } from "./get-user-progress.use-case";

@Injectable()
export class GetCourseProgressUseCase extends CourseLearningMapper {
  constructor(
    prisma: PrismaService,
    private readonly getUserProgress: GetUserProgressUseCase
  ) {
    super(prisma);
  }

  async execute(userId: string) {
    const userProgress = await this.getUserProgress.execute(userId);

    if (!userProgress?.activeCourseId) return null;

    const unitsInActiveCourse = await this.prisma.units.findMany({
      where: { course_id: userProgress.activeCourseId },
      orderBy: { order: "asc" },
      include: {
        lessons: {
          orderBy: { order: "asc" },
          include: {
            units: true,
            challenges: {
              include: {
                vocabulary_items: true,
                challenge_progress: {
                  where: { user_id: userId },
                },
              },
            },
          },
        },
      },
    });

    const firstUncompletedLesson = unitsInActiveCourse
      .flatMap((unit) => unit.lessons)
      .map((lesson): LessonWithChallenges & { unit: UnitRecord } => ({
        ...this.mapLessonWithChallenges(lesson),
        unit: this.mapUnitRecord(lesson.units),
      }))
      .find((lesson) => {
        return lesson.challenges.some((challenge) => {
          return (
            challenge.challengeProgress.length === 0 ||
            challenge.challengeProgress.some((progress) => !progress.completed)
          );
        });
      });

    return {
      activeLesson: firstUncompletedLesson
        ? {
            id: firstUncompletedLesson.id,
            title: firstUncompletedLesson.title,
            unitId: firstUncompletedLesson.unitId,
            order: firstUncompletedLesson.order,
            unit: firstUncompletedLesson.unit,
          }
        : undefined,
      activeLessonId: firstUncompletedLesson?.id,
    };
  }
}
