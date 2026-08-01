import { Injectable, NotFoundException } from "@nestjs/common";
import type { ToeicReadingAttemptResult } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapToeicReadingAttemptResult } from "../toeic-reading.mapper";

export const toeicReadingAttemptResultSelect = {
  id: true,
  test_id: true,
  practice_part: true,
  submission_fingerprint: true,
  source_version_snapshot: true,
  test_title_snapshot: true,
  correct_count: true,
  total_count: true,
  accuracy: true,
  submitted_at: true,
  toeic_reading_attempt_answers: {
    orderBy: { question_number_snapshot: "asc" as const },
    select: {
      question_id_snapshot: true,
      question_number_snapshot: true,
      part_snapshot: true,
      question_prompt_snapshot: true,
      selected_option_label_snapshot: true,
      selected_option_text_snapshot: true,
      correct_option_label_snapshot: true,
      correct_option_text_snapshot: true,
      explanation_snapshot: true,
      correct: true,
    },
  },
};

@Injectable()
export class GetToeicReadingAttemptUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    attemptId: number
  ): Promise<ToeicReadingAttemptResult> {
    const attempt = await this.prisma.toeic_reading_attempts.findFirst({
      where: { id: attemptId, user_id: userId },
      select: toeicReadingAttemptResultSelect,
    });
    if (!attempt) {
      throw new NotFoundException("TOEIC Reading attempt not found");
    }
    return mapToeicReadingAttemptResult(attempt);
  }
}
