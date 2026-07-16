import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapPracticeSession } from "../practice-session.mapper";

@Injectable()
export class RemoveAdminPracticeSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    return mapPracticeSession(
      await this.prisma.practice_sessions.delete({ where: { id } })
    );
  }
}
