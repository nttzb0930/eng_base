import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { PlacementTestResponse } from "@repo/shared/placement-test";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  levelFallbacks,
  PLACEMENT_QUESTION_COUNT,
  questionType,
} from "./placement-test.rules";

type RandomSource = () => number;
type PlacementChallenge = Prisma.challengesGetPayload<{
  include: {
    challenge_options: true;
    vocabulary_items: true;
  };
}>;

@Injectable()
export class GetNextPlacementQuestionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    random: RandomSource = Math.random
  ): Promise<PlacementTestResponse> {
    let session = await this.prisma.placement_test_sessions.findUnique({
      where: { user_id: userId },
    });
    if (!session) {
      session = await this.prisma.placement_test_sessions.create({
        data: {
          user_id: userId,
          current_theta: 2,
          answered_count: 0,
          theta_history: [],
          used_word_ids: [],
          status: "IN_PROGRESS",
          buffer_options: [],
        },
      });
    }

    if (session.status === "COMPLETED") {
      return {
        status: "COMPLETED",
        finalScore: session.final_score!,
        recommendedLevel: session.recommended_level!,
        inBufferZone: session.buffer_options.length > 0,
        bufferOptions: session.buffer_options,
      };
    }
    if (session.status === "CONFIRMED") {
      return {
        status: "CONFIRMED",
        confirmedLevel: session.confirmed_level!,
      };
    }
    if (session.answered_count >= PLACEMENT_QUESTION_COUNT) {
      await this.prisma.placement_test_sessions.update({
        where: { user_id: userId },
        data: { status: "COMPLETED" },
      });
      return {
        status: "COMPLETED",
        finalScore: session.final_score!,
        recommendedLevel: session.recommended_level!,
        inBufferZone: session.buffer_options.length > 0,
        bufferOptions: session.buffer_options,
      };
    }

    const type = questionType(session.answered_count);
    const { levels } = levelFallbacks(session.current_theta);
    let challenge: PlacementChallenge | null = null;

    for (const level of levels) {
      const where = {
        type,
        vocabulary_items: {
          cefr_level: level,
          id: { notIn: session.used_word_ids },
        },
      };
      const count = await this.prisma.challenges.count({ where });
      if (count === 0) continue;
      challenge = await this.prisma.challenges.findFirst({
        where,
        skip: Math.floor(random() * count),
        include: {
          challenge_options: true,
          vocabulary_items: true,
        },
      });
      if (challenge) break;
    }

    if (!challenge) {
      throw new NotFoundException("PLACEMENT_TEST_NO_QUESTIONS");
    }

    return {
      status: "IN_PROGRESS",
      questionNumber: session.answered_count + 1,
      onboardingStep: session.onboarding_step,
      onboardingData:
        session.onboarding_data &&
        typeof session.onboarding_data === "object" &&
        !Array.isArray(session.onboarding_data)
          ? (session.onboarding_data as Record<string, unknown>)
          : undefined,
      challenge: {
        id: challenge.id,
        direction: challenge.direction,
        question: challenge.question,
        word: challenge.vocabulary_items?.word ?? null,
        primaryMeaningVi:
          challenge.vocabulary_items?.primary_meaning_vi ?? null,
        options: challenge.challenge_options.map((option) => ({
          id: option.id,
          text: option.text,
        })),
        audioUrl: challenge.vocabulary_items?.audio_url ?? null,
      },
    };
  }
}
