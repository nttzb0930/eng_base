import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapPracticeSessionDetail } from "../practice-session.mapper";

@Injectable()
export class GetAdminPracticeSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    const session = await this.prisma.practice_sessions.findUnique({
      where: { id },
      include: {
        items: { include: { vocabulary_items: true } },
      },
    });
    if (!session) {
      throw new NotFoundException(`Practice session with ID ${id} not found`);
    }
    return mapPracticeSessionDetail(session);
  }
}
