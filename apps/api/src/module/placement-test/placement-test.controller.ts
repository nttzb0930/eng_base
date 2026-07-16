import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";

import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import {
  ConfirmPlacementLevelDto,
  SubmitPlacementAnswerDto,
  UpdateOnboardingDto,
} from "./dto/placement-test.dto";
import { ConfirmPlacementLevelUseCase } from "./use-cases/confirm-placement-level.use-case";
import { GetNextPlacementQuestionUseCase } from "./use-cases/get-next-placement-question.use-case";
import { ResetPlacementTestUseCase } from "./use-cases/reset-placement-test.use-case";
import { SubmitPlacementAnswerUseCase } from "./use-cases/submit-placement-answer.use-case";
import { UpdateOnboardingStateUseCase } from "./use-cases/update-onboarding-state.use-case";

@Controller("placement-test")
@UseGuards(UserJwtGuard)
export class PlacementTestController {
  constructor(
    private readonly getNextQuestion: GetNextPlacementQuestionUseCase,
    private readonly submitPlacementAnswer: SubmitPlacementAnswerUseCase,
    private readonly confirmPlacementLevel: ConfirmPlacementLevelUseCase,
    private readonly updateOnboardingState: UpdateOnboardingStateUseCase,
    private readonly resetPlacementTest: ResetPlacementTestUseCase
  ) {}

  @Get("question")
  question(@CurrentUserId() userId: string) {
    return this.getNextQuestion.execute(userId);
  }

  @Post("answer")
  answer(
    @CurrentUserId() userId: string,
    @Body() body: SubmitPlacementAnswerDto
  ) {
    return this.submitPlacementAnswer.execute(
      userId,
      body.challengeId,
      body.selectedOptionId
    );
  }

  @Post("confirm")
  confirm(
    @CurrentUserId() userId: string,
    @Body() body: ConfirmPlacementLevelDto
  ) {
    return this.confirmPlacementLevel.execute(userId, body);
  }

  @Post("reset")
  reset(@CurrentUserId() userId: string) {
    return this.resetPlacementTest.execute(userId);
  }

  @Post("onboarding")
  onboarding(
    @CurrentUserId() userId: string,
    @Body() body: UpdateOnboardingDto
  ) {
    return this.updateOnboardingState.execute(userId, body.step, body.data);
  }
}
