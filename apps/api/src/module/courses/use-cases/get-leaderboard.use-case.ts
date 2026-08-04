import { Injectable } from "@nestjs/common";
import type { LeaderboardResponse } from "@repo/shared";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CourseLearningMapper } from "./course-learning.mapper";

@Injectable()
export class GetLeaderboardUseCase extends CourseLearningMapper {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async execute(
    userId?: string,
    period: string = "weekly"
  ): Promise<LeaderboardResponse> {
    const selectedPeriod = period || "weekly";
    const limit = selectedPeriod === "alltime" ? 50 : 20;

    const [data, totalLearnersCount] = await Promise.all([
      this.prisma.user_progress.findMany({
        orderBy: { points: "desc" },
        take: limit,
      }),
      this.prisma.user_progress.count(),
    ]);

    const totalLearners = totalLearnersCount;

    // Real calendar-driven season calculation
    const now = new Date();
    const seasonNumber = (now.getFullYear() - 2026) * 12 + (now.getMonth() + 1);
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    const daysRemaining = Math.max(1, lastDayOfMonth - now.getDate());

    let currentUserProgress = userId
      ? data.find((p) => p.user_id === userId)
      : undefined;

    if (userId && !currentUserProgress) {
      currentUserProgress =
        (await this.prisma.user_progress.findUnique({
          where: { user_id: userId },
        })) ?? undefined;
    }

    let rank = totalLearners > 0 ? totalLearners : 1;
    let currentPoints = 0;
    let nextRankNumber = 1;
    let nextRankPointsNeeded = 0;
    let percentileText = "Top 100%";

    if (currentUserProgress) {
      currentPoints = currentUserProgress.points;
      const foundRankIndex = data.findIndex(
        (p) => p.user_id === currentUserProgress?.user_id
      );

      if (foundRankIndex !== -1) {
        rank = foundRankIndex + 1;
      } else {
        const higherUsersCount = await this.prisma.user_progress.count({
          where: { points: { gt: currentPoints } },
        });
        rank = higherUsersCount + 1;
      }

      if (rank > 1) {
        nextRankNumber = rank - 1;
        let pointsAhead = 0;
        if (foundRankIndex > 0) {
          pointsAhead = data[foundRankIndex - 1].points;
        } else {
          const userAbove = await this.prisma.user_progress.findFirst({
            where: { points: { gt: currentPoints } },
            orderBy: { points: "asc" },
            select: { points: true },
          });
          pointsAhead = userAbove ? userAbove.points : currentPoints + 10;
        }
        nextRankPointsNeeded = Math.max(0, pointsAhead - currentPoints + 1);
      } else {
        nextRankNumber = 1;
        nextRankPointsNeeded = 0;
      }

      const percentileValue = Math.max(
        1,
        Math.ceil((rank / Math.max(totalLearners, 1)) * 100)
      );
      percentileText = `Top ${percentileValue}%`;
    }

    const topUsers = data.map((progress, index) => {
      const userRank = index + 1;
      const level = Math.max(1, Math.floor(progress.points / 50) + 1);

      return {
        userId: progress.user_id,
        userName: progress.user_name || "Learner",
        userImageSrc: progress.user_image_src || "/mascot.svg",
        points: progress.points,
        rank: userRank,
        level,
      };
    });

    return {
      seasonInfo: {
        seasonNumber,
        daysRemaining,
      },
      currentUserRank: {
        rank,
        totalLearners,
        points: currentPoints,
        nextRankPointsNeeded,
        nextRankNumber,
        percentileText,
      },
      topUsers,
      totalLearners,
    };
  }
}
