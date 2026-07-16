import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CourseLearningMapper } from "./course-learning.mapper";
import { GetUserProgressUseCase } from "./get-user-progress.use-case";

@Injectable()
export class GetCourseUnitsUseCase extends CourseLearningMapper {
  constructor(
    prisma: PrismaService,
    private readonly getUserProgress: GetUserProgressUseCase
  ) {
    super(prisma);
  }

  async execute(userId: string) {
    const userProgress = await this.getUserProgress.execute(userId);

    if (!userProgress?.activeCourseId) return [];

    const data = await this.prisma.units.findMany({
      where: { course_id: userProgress.activeCourseId },
      orderBy: { order: "asc" },
      include: {
        lessons: {
          orderBy: { order: "asc" },
          include: {
            challenges: {
              orderBy: { order: "asc" },
              include: {
                challenge_progress: {
                  where: { user_id: userId },
                },
              },
            },
          },
        },
      },
    });

    return data.map((rawUnit) => {
      const unit = this.mapUnitWithLessons(rawUnit);
      const lessons = rawUnit.lessons.map((rawLesson) => {
        const lesson = this.mapLessonWithChallenges(rawLesson);

        if (lesson.challenges.length === 0)
          return { ...this.mapLessonRecord(rawLesson), completed: false };

        const completed = lesson.challenges.every((challenge) => {
          return (
            challenge.challengeProgress.length > 0 &&
            challenge.challengeProgress.every((progress) => progress.completed)
          );
        });

        return { ...this.mapLessonRecord(rawLesson), completed };
      });

      return { ...unit, lessons };
    });
  }
}
