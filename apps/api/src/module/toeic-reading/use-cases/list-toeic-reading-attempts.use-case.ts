import { Injectable } from "@nestjs/common";
import type {
  ToeicReadingAttemptSummary,
  ToeicReadingPart,
} from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapToeicReadingAttemptSummary } from "../toeic-reading.mapper";

@Injectable()
export class ListToeicReadingAttemptsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    part?: ToeicReadingPart
  ): Promise<ToeicReadingAttemptSummary[]> {
    const attempts = await this.prisma.toeic_reading_attempts.findMany({
      where: {
        user_id: userId,
        ...(part === undefined ? {} : { practice_part: part }),
      },
      orderBy: [{ submitted_at: "desc" }, { id: "desc" }],
      select: {
        id: true,
        test_id: true,
        practice_part: true,
        test_title_snapshot: true,
        correct_count: true,
        total_count: true,
        accuracy: true,
        submitted_at: true,
      },
    });
    return attempts.map(mapToeicReadingAttemptSummary);
  }
}
