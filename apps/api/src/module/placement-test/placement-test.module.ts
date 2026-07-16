import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { PlacementTestController } from "./placement-test.controller";
import { ConfirmPlacementLevelUseCase } from "./use-cases/confirm-placement-level.use-case";
import { GetNextPlacementQuestionUseCase } from "./use-cases/get-next-placement-question.use-case";
import { ResetPlacementTestUseCase } from "./use-cases/reset-placement-test.use-case";
import { SubmitPlacementAnswerUseCase } from "./use-cases/submit-placement-answer.use-case";
import { UpdateOnboardingStateUseCase } from "./use-cases/update-onboarding-state.use-case";

@Module({
  imports: [PrismaModule],
  controllers: [PlacementTestController],
  providers: [
    GetNextPlacementQuestionUseCase,
    SubmitPlacementAnswerUseCase,
    ConfirmPlacementLevelUseCase,
    UpdateOnboardingStateUseCase,
    ResetPlacementTestUseCase,
  ],
})
export class PlacementTestModule {}
