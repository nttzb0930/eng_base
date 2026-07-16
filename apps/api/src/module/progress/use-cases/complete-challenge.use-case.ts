import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class CompleteChallengeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  execute(userId: string, challengeId: number) {
    return this.prisma.$transaction(
      async (transaction) => {
        const [progress, challenge] = await Promise.all([
          transaction.user_progress.findUnique({ where: { user_id: userId } }),
          transaction.challenges.findUnique({
            where: { id: challengeId },
            select: { id: true },
          }),
        ]);
        if (!progress) throw new NotFoundException("User progress not found.");
        if (!challenge) throw new NotFoundException("Challenge not found.");

        if (progress.hearts === 0) {
          const existing = await transaction.challenge_progress.findUnique({
            where: {
              user_id_challenge_id: {
                user_id: userId,
                challenge_id: challengeId,
              },
            },
          });
          return existing
            ? { completed: true, awardedPoints: 0 }
            : { error: "hearts" as const };
        }

        const inserted = await transaction.challenge_progress.createMany({
          data: [{
            challenge_id: challengeId,
            user_id: userId,
            completed: true,
          }],
          skipDuplicates: true,
        });
        if (inserted.count === 0) {
          return { completed: true, awardedPoints: 0 };
        }
        await transaction.user_progress.update({
          where: { user_id: userId },
          data: { points: { increment: 10 } },
        });
        return { completed: true, awardedPoints: 10 };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }
}
