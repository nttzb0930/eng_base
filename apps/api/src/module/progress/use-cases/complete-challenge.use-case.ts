import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { getMaxHearts } from "./get-max-hearts";

@Injectable()
export class CompleteChallengeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  execute(userId: string, challengeId: number) {
    return this.prisma.$transaction(
      async (transaction) => {
        const [progress, challenge, existing] = await Promise.all([
          transaction.user_progress.findUnique({ where: { user_id: userId } }),
          transaction.challenges.findUnique({
            where: { id: challengeId },
            select: { id: true },
          }),
          transaction.challenge_progress.findFirst({
            where: { user_id: userId, challenge_id: challengeId },
          }),
        ]);
        if (!progress) throw new NotFoundException("User progress not found.");
        if (!challenge) throw new NotFoundException("Challenge not found.");

        if (progress.hearts === 0 && !existing) {
          return { error: "hearts" as const };
        }

        if (existing) {
          await transaction.challenge_progress.update({
            where: { id: existing.id },
            data: { completed: true },
          });
          const maxHearts = await getMaxHearts(transaction as PrismaService);
          await transaction.user_progress.update({
            where: { user_id: userId },
            data: {
              hearts: Math.min(progress.hearts + 1, maxHearts),
              points: { increment: 10 },
            },
          });
          return;
        }

        await transaction.challenge_progress.create({
          data: {
            challenge_id: challengeId,
            user_id: userId,
            completed: true,
          },
        });
        await transaction.user_progress.update({
          where: { user_id: userId },
          data: { points: { increment: 10 } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }
}
