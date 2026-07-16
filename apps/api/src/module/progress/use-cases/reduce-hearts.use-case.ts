import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class ReduceHeartsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, challengeId: number) {
    const challenge = await this.prisma.challenges.findUnique({
      where: { id: challengeId },
      select: { id: true },
    });
    if (!challenge) throw new NotFoundException("Challenge not found.");

    const practice = await this.prisma.challenge_progress.findFirst({
      where: { user_id: userId, challenge_id: challengeId },
      select: { id: true },
    });
    if (practice) return { error: "practice" as const };

    const updated = await this.prisma.user_progress.updateMany({
      where: { user_id: userId, hearts: { gt: 0 } },
      data: { hearts: { decrement: 1 } },
    });
    if (updated.count === 0) {
      const progress = await this.prisma.user_progress.findUnique({
        where: { user_id: userId },
      });
      if (!progress) throw new NotFoundException("User progress not found.");
      return { error: "hearts" as const };
    }

    const progress = await this.prisma.user_progress.findUnique({
      where: { user_id: userId },
      select: { hearts: true },
    });
    return progress?.hearts === 0 ? { error: "hearts" as const } : undefined;
  }
}
