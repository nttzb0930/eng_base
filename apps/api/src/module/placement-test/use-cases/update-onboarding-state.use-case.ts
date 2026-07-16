import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class UpdateOnboardingStateUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, step: number, data?: Record<string, unknown>) {
    await this.prisma.placement_test_sessions.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        current_theta: 2,
        answered_count: 0,
        theta_history: [],
        used_word_ids: [],
        status: "IN_PROGRESS",
        buffer_options: [],
        onboarding_step: step,
        onboarding_data: (data ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        onboarding_step: step,
        onboarding_data: (data ?? {}) as Prisma.InputJsonValue,
      },
    });
    return this.prisma.placement_test_sessions.findUnique({
      where: { user_id: userId },
    });
  }
}
