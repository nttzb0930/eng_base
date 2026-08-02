import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ToeicReadingPracticeSession } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapToeicReadingPracticeSession,
  toeicReadingPracticeSessionSelect,
} from "../toeic-reading-practice.mapper";

@Injectable()
export class GetToeicReadingPracticeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    sessionId: number
  ): Promise<ToeicReadingPracticeSession> {
    const session = await this.prisma.toeic_reading_practice_sessions.findFirst(
      {
        where: { id: sessionId, user_id: userId },
        select: toeicReadingPracticeSessionSelect,
      }
    );
    if (!session)
      throw new NotFoundException("TOEIC Reading practice not found");
    if (
      session.toeic_tests.status !== "PUBLISHED" ||
      session.toeic_tests.source_version !== session.source_version
    ) {
      throw new ConflictException(
        "TOEIC Reading test changed; start a new practice session"
      );
    }
    return mapToeicReadingPracticeSession(session);
  }
}
