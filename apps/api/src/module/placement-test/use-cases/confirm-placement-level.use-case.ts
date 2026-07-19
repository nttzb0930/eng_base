import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { ENGLISH_VOCABULARY_COURSE_CODE } from "../../courses/course.constants";
import { PLACEMENT_LEVELS } from "./placement-test.rules";

export type ConfirmPlacementLevelInput = {
  level: string;
  languages?: string[];
  goals?: string[];
  intensity?: string;
  primaryLanguage?: string;
  customGoal?: string;
};

@Injectable()
export class ConfirmPlacementLevelUseCase {
  constructor(private readonly prisma: PrismaService) {}

  execute(userId: string, input: ConfirmPlacementLevelInput) {
    return this.prisma.$transaction(
      async (transaction) => {
        const session = await transaction.placement_test_sessions.findUnique({
          where: { user_id: userId },
        });
        if (
          (!session || session.status !== "COMPLETED") &&
          input.level !== "A1"
        ) {
          throw new BadRequestException("SESSION_NOT_COMPLETED");
        }
        if (!PLACEMENT_LEVELS.includes(input.level as never)) {
          throw new BadRequestException("INVALID_LEVEL");
        }

        const defaultCourse = await transaction.courses.findFirst({
          where: { code: ENGLISH_VOCABULARY_COURSE_CODE },
        });
        if (!defaultCourse) throw new NotFoundException("Course not found");

        const user = await transaction.users.findUnique({
          where: { id: userId },
        });
        const userName = user?.full_name || user?.username || "User";

        await transaction.placement_test_sessions.upsert({
          where: { user_id: userId },
          create: {
            user_id: userId,
            status: "CONFIRMED",
            confirmed_level: input.level,
            onboarding_step: 1,
            onboarding_data: Prisma.DbNull,
          },
          update: {
            status: "CONFIRMED",
            confirmed_level: input.level,
            onboarding_step: 1,
            onboarding_data: Prisma.DbNull,
          },
        });
        await transaction.user_progress.upsert({
          where: { user_id: userId },
          create: {
            user_id: userId,
            active_course_id: defaultCourse.id,
            user_name: userName,
            user_image_src: "/mascot.svg",
            languages: input.languages ?? ["en"],
            primary_language: input.primaryLanguage ?? "en",
            goals: input.goals ?? [],
            intensity: input.intensity ?? "standard",
            custom_goal: input.customGoal,
          },
          update: {
            active_course_id: defaultCourse.id,
            user_name: userName,
            languages: input.languages ?? undefined,
            primary_language: input.primaryLanguage ?? undefined,
            goals: input.goals ?? undefined,
            intensity: input.intensity ?? undefined,
            custom_goal: input.customGoal ?? undefined,
          },
        });

        const targetUnitOrder =
          PLACEMENT_LEVELS.indexOf(
            input.level as (typeof PLACEMENT_LEVELS)[number]
          ) + 1;
        if (targetUnitOrder > 1) {
          const units = await transaction.units.findMany({
            where: {
              course_id: defaultCourse.id,
              order: { lt: targetUnitOrder },
            },
            include: {
              lessons: { include: { challenges: true } },
            },
          });
          const challengeIds = units.flatMap((unit) =>
            unit.lessons.flatMap((lesson) =>
              lesson.challenges.map((challenge) => challenge.id)
            )
          );
          if (challengeIds.length > 0) {
            await transaction.challenge_progress.createMany({
              data: challengeIds.map((challengeId) => ({
                user_id: userId,
                challenge_id: challengeId,
                completed: true,
              })),
              skipDuplicates: true,
            });
          }
        }

        return {
          status: "CONFIRMED",
          confirmedLevel: input.level,
          activeCourseId: defaultCourse.id,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }
}
