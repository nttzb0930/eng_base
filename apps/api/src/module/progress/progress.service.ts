import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma/prisma.service";
import { CoursesService } from "../courses";

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService
  ) {}

  async getUserProgress(userId: string) {
    return this.coursesService.getUserProgress(userId);
  }

  async getCourseProgress(userId: string) {
    return this.coursesService.getCourseProgress(userId);
  }

  async getLessonPercentage(userId: string) {
    return this.coursesService.getLessonPercentage(userId);
  }

  async upsertUserProgress(userId: string, courseId: number) {
    if (!userId) throw new UnauthorizedException("TOKEN_INVALID");

    const dbUser = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!dbUser) throw new NotFoundException("User not found.");

    const course = await this.coursesService.getCourseById(courseId);

    if (!course) throw new NotFoundException("Course not found.");

    if (!course.units.length || !course.units[0].lessons.length)
      throw new BadRequestException("Course is empty.");

    const existingUserProgress =
      await this.coursesService.getUserProgress(userId);
    const userName = dbUser.full_name || dbUser.username || "User";

    if (existingUserProgress) {
      await this.prisma.user_progress.update({
        where: { user_id: userId },
        data: {
          active_course_id: courseId,
          user_name: userName,
          user_image_src: "/mascot.svg",
        },
      });
      return;
    }

    await this.prisma.user_progress.create({
      data: {
        user_id: userId,
        active_course_id: courseId,
        user_name: userName,
        user_image_src: "/mascot.svg",
      },
    });
  }

  async getMaxHearts(): Promise<number> {
    try {
      const setting = await this.prisma.system_settings.findUnique({
        where: { key: "MAX_HEARTS" },
      });
      if (setting && setting.value) {
        const parsed = parseInt(setting.value, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch {
      // Ignore error, fallback to default
    }
    return 5;
  }

  async refillHearts(userId: string) {
    if (!userId) throw new UnauthorizedException("TOKEN_INVALID");

    const maxHearts = await this.getMaxHearts();

    const result = await this.prisma.user_progress.update({
      where: { user_id: userId },
      data: {
        hearts: maxHearts,
      },
    });
    return result;
  }

  async reduceHearts(userId: string, challengeId: number) {
    if (!userId) throw new UnauthorizedException("TOKEN_INVALID");

    const currentUserProgress =
      await this.coursesService.getUserProgress(userId);

    const challenge = await this.prisma.challenges.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) throw new NotFoundException("Challenge not found.");

    const existingChallengeProgress =
      await this.prisma.challenge_progress.findFirst({
        where: {
          user_id: userId,
          challenge_id: challengeId,
        },
      });

    const isPractice = !!existingChallengeProgress;

    if (isPractice) return { error: "practice" };

    if (!currentUserProgress) {
      throw new NotFoundException("User progress not found.");
    }

    if (currentUserProgress.hearts === 0) return { error: "hearts" };

    const newHeartsCount = Math.max(currentUserProgress.hearts - 1, 0);

    await this.prisma.user_progress.update({
      where: { user_id: userId },
      data: {
        hearts: newHeartsCount,
      },
    });

    if (newHeartsCount === 0) {
      return { error: "hearts" };
    }
  }

  async upsertChallengeProgress(userId: string, challengeId: number) {
    if (!userId) throw new UnauthorizedException("TOKEN_INVALID");

    const currentUserProgress =
      await this.coursesService.getUserProgress(userId);

    if (!currentUserProgress) {
      throw new NotFoundException("User progress not found.");
    }

    const challenge = await this.prisma.challenges.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) throw new NotFoundException("Challenge not found.");

    const existingChallengeProgress =
      await this.prisma.challenge_progress.findFirst({
        where: {
          user_id: userId,
          challenge_id: challengeId,
        },
      });

    const isPractice = !!existingChallengeProgress;

    if (currentUserProgress.hearts === 0 && !isPractice)
      return { error: "hearts" };

    if (isPractice) {
      await this.prisma.challenge_progress.update({
        where: { id: existingChallengeProgress.id },
        data: {
          completed: true,
        },
      });

      const maxHearts = await this.getMaxHearts();

      await this.prisma.user_progress.update({
        where: { user_id: userId },
        data: {
          hearts: Math.min(currentUserProgress.hearts + 1, maxHearts),
          points: currentUserProgress.points + 10,
        },
      });
      return;
    }

    await this.prisma.challenge_progress.create({
      data: {
        challenge_id: challengeId,
        user_id: userId,
        completed: true,
      },
    });

    await this.prisma.user_progress.update({
      where: { user_id: userId },
      data: {
        points: currentUserProgress.points + 10,
      },
    });
  }

  async resetLessonProgress(userId: string, lessonId: number) {
    if (!userId) throw new UnauthorizedException("TOKEN_INVALID");

    // Find all challenge IDs in this lesson
    const challenges = await this.prisma.challenges.findMany({
      where: { lesson_id: lessonId },
      select: { id: true },
    });

    const challengeIds = challenges.map((c) => c.id);

    // Delete all challenge_progress records for this lesson
    await this.prisma.challenge_progress.deleteMany({
      where: {
        user_id: userId,
        challenge_id: { in: challengeIds },
      },
    });

    return { ok: true };
  }
}
