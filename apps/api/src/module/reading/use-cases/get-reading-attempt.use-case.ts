import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapReadingAttemptResult } from "../mappers/reading.mapper";

@Injectable()
export class GetReadingAttemptUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, attemptId: number) {
    const attempt = await this.prisma.reading_attempts.findFirst({
      where: { id: attemptId, user_id: userId },
      select: {
        id: true,
        passage_id: true,
        passage_title_snapshot: true,
        correct_count: true,
        total_count: true,
        accuracy: true,
        submitted_at: true,
        reading_attempt_answers: {
          orderBy: { question_id_snapshot: "asc" },
          select: {
            question_id_snapshot: true,
            question_prompt_snapshot: true,
            selected_option_text_snapshot: true,
            correct_option_text_snapshot: true,
            correct: true,
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException("Reading attempt not found");
    return mapReadingAttemptResult(attempt);
  }
}
