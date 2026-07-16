import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class ResetLessonProgressUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, lessonId: number) {
    const challenges = await this.prisma.challenges.findMany({
      where: { lesson_id: lessonId },
      select: { id: true },
    });
    await this.prisma.challenge_progress.deleteMany({
      where: {
        user_id: userId,
        challenge_id: { in: challenges.map(({ id }) => id) },
      },
    });
    return { ok: true };
  }
}
