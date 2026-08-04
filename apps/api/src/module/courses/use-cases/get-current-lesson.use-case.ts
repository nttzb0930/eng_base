import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CourseLearningMapper } from "./course-learning.mapper";
import { GetCourseProgressUseCase } from "./get-course-progress.use-case";

@Injectable()
export class GetCurrentLessonUseCase extends CourseLearningMapper {
  constructor(
    prisma: PrismaService,
    private readonly getCourseProgress: GetCourseProgressUseCase
  ) {
    super(prisma);
  }

  async execute(userId: string, id?: number) {
    const courseProgress = await this.getCourseProgress.execute(userId);
    const lessonId = id || courseProgress?.activeLessonId;

    if (!lessonId) return null;

    const data = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      include: {
        challenges: {
          orderBy: [{ order: "asc" }, { id: "asc" }],
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
            challenge_options: true,
            challenge_progress: {
              where: { user_id: userId },
            },
          },
        },
      },
    });

    if (!data) return null;

    const lesson = this.mapLessonWithChallenges(data);
    const normalizedChallenges = lesson.challenges.map((challenge) => {
      const completed =
        challenge.challengeProgress.length > 0 &&
        challenge.challengeProgress.every((progress) => progress.completed);

      return { ...challenge, completed };
    });

    return { ...lesson, challenges: normalizedChallenges };
  }
}
