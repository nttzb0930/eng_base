import { Injectable } from "@nestjs/common";
import type {
  ToeicListeningAttemptSummary,
  ToeicListeningPart,
} from "@repo/shared";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapToeicListeningAttemptSummary } from "../toeic-listening.mapper";

@Injectable()
export class ListToeicListeningAttemptsUseCase {
  constructor(private readonly prisma: PrismaService) {}
  async execute(
    userId: string,
    part?: ToeicListeningPart
  ): Promise<ToeicListeningAttemptSummary[]> {
    const attempts = await this.prisma.toeic_listening_attempts.findMany({
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
    return attempts.map(mapToeicListeningAttemptSummary);
  }
}
