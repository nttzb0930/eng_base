import { Injectable, NotFoundException } from "@nestjs/common";
import type { ToeicListeningAttemptResult } from "@repo/shared";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapToeicListeningAttemptResult } from "../toeic-listening.mapper";

export const toeicListeningAttemptResultSelect = {
  id: true,
  test_id: true,
  practice_part: true,
  submission_fingerprint: true,
  listening_source_version_snapshot: true,
  test_title_snapshot: true,
  correct_count: true,
  total_count: true,
  accuracy: true,
  submitted_at: true,
  toeic_listening_attempt_answers: {
    orderBy: { question_number_snapshot: "asc" as const },
    select: {
      question_id_snapshot: true,
      question_number_snapshot: true,
      part_snapshot: true,
      question_prompt_snapshot: true,
      transcript_snapshot: true,
      transcript_translation_snapshot: true,
      question_media_snapshot: true,
      stimulus_snapshot: true,
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
export class GetToeicListeningAttemptUseCase {
  constructor(private readonly prisma: PrismaService) {}
  async execute(
    userId: string,
    attemptId: number
  ): Promise<ToeicListeningAttemptResult> {
    const attempt = await this.prisma.toeic_listening_attempts.findFirst({
      where: { id: attemptId, user_id: userId },
      select: toeicListeningAttemptResultSelect,
    });
    if (!attempt)
      throw new NotFoundException("TOEIC Listening attempt not found");
    return mapToeicListeningAttemptResult(attempt);
  }
}
