import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class ResetPlacementTestUseCase {
  constructor(private readonly prisma: PrismaService) {}

  execute(userId: string) {
    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.placement_test_sessions.deleteMany({
          where: { user_id: userId },
        });
        await transaction.challenge_progress.deleteMany({
          where: { user_id: userId },
        });
        return { status: "RESET_SUCCESS" };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }
}
