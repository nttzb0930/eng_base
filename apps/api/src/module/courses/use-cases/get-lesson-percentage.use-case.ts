import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CourseLearningMapper } from "./course-learning.mapper";
import { GetCourseProgressUseCase } from "./get-course-progress.use-case";
import { GetCurrentLessonUseCase } from "./get-current-lesson.use-case";

@Injectable()
export class GetLessonPercentageUseCase extends CourseLearningMapper {
  constructor(
    prisma: PrismaService,
    private readonly getCourseProgress: GetCourseProgressUseCase,
    private readonly getLesson: GetCurrentLessonUseCase
  ) {
    super(prisma);
  }

  async execute(userId: string) {
    const courseProgress = await this.getCourseProgress.execute(userId);

    if (!courseProgress?.activeLessonId) return 0;

    const lesson = await this.getLesson.execute(
      userId,
      courseProgress?.activeLessonId
    );

    if (!lesson) return 0;

    const completedChallenges = lesson.challenges.filter(
      (challenge) => challenge.completed
    );

    return Math.round(
      (completedChallenges.length / lesson.challenges.length) * 100
    );
  }
}
