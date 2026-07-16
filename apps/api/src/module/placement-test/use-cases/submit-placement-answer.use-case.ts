import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { SubmitAnswerResponse } from "@repo/shared/placement-test";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  nextTheta,
  placementResult,
  PLACEMENT_QUESTION_COUNT,
} from "./placement-test.rules";

@Injectable()
export class SubmitPlacementAnswerUseCase {
  constructor(private readonly prisma: PrismaService) {}

  execute(
    userId: string,
    challengeId: number,
    selectedOptionId: number
  ): Promise<SubmitAnswerResponse> {
    return this.prisma.$transaction(
      async (transaction) => {
        const session = await transaction.placement_test_sessions.findUnique({
          where: { user_id: userId },
        });
        if (!session || session.status !== "IN_PROGRESS") {
          throw new BadRequestException("SESSION_NOT_RUNNING");
        }

        const selectedOption = await transaction.challenge_options.findUnique({
          where: { id: selectedOptionId },
        });
        if (!selectedOption || selectedOption.challenge_id !== challengeId) {
          throw new BadRequestException("INVALID_OPTION");
        }

        const challenge = await transaction.challenges.findUnique({
          where: { id: challengeId },
          select: { vocabulary_item_id: true },
        });
        const theta = nextTheta(
          session.current_theta,
          session.answered_count,
          selectedOption.correct
        );
        const thetaHistory = [...session.theta_history, theta];
        const usedWordIds = [...session.used_word_ids];
        if (challenge?.vocabulary_item_id) {
          usedWordIds.push(challenge.vocabulary_item_id);
        }
        const answeredCount = session.answered_count + 1;

        if (answeredCount === PLACEMENT_QUESTION_COUNT) {
          const result = placementResult(thetaHistory);
          await transaction.placement_test_sessions.update({
            where: { user_id: userId },
            data: {
              current_theta: theta,
              answered_count: answeredCount,
              theta_history: thetaHistory,
              used_word_ids: usedWordIds,
              status: "COMPLETED",
              final_score: result.finalScore,
              recommended_level: result.recommendedLevel,
              buffer_options: result.bufferOptions,
            },
          });
          return {
            status: "COMPLETED",
            isCorrect: selectedOption.correct,
            ...result,
          };
        }

        await transaction.placement_test_sessions.update({
          where: { user_id: userId },
          data: {
            current_theta: theta,
            answered_count: answeredCount,
            theta_history: thetaHistory,
            used_word_ids: usedWordIds,
          },
        });
        return {
          status: "IN_PROGRESS",
          isCorrect: selectedOption.correct,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }
}
