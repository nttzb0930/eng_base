import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { PracticeSessionResultInputDto } from "../dto/practice-session-result.dto";

@Injectable()
export class CreatePracticeSessionResultUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    { mode, items }: PracticeSessionResultInputDto
  ) {
    const cleanItems = items.filter((item) => item.vocabularyItemId > 0);
    if (cleanItems.length === 0) return null;

    const correctCount = cleanItems.filter((item) => item.correct).length;
    const wrongCount = cleanItems.length - correctCount;
    const accuracy = Math.round((correctCount / cleanItems.length) * 100);
    const session = await this.prisma.practice_sessions.create({
      data: {
        user_id: userId,
        mode,
        correct_count: correctCount,
        wrong_count: wrongCount,
        accuracy,
        items: {
          create: cleanItems.map((item) => ({
            vocabulary_item_id: item.vocabularyItemId,
            challenge_type: item.challengeType,
            correct: item.correct,
            answer: item.answer,
          })),
        },
      },
    });
    return {
      id: session.id,
      mode: session.mode,
      correctCount: session.correct_count,
      wrongCount: session.wrong_count,
      accuracy: session.accuracy,
      createdAt: session.created_at,
    };
  }
}
