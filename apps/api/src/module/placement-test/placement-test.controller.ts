import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { PlacementTestService } from "./placement-test.service";
import { IsNumber, IsString, IsArray, IsOptional } from "class-validator";

export class SubmitAnswerDto {
  @IsNumber()
  challengeId!: number;

  @IsNumber()
  selectedOptionId!: number;
}

export class ConfirmLevelDto {
  @IsString()
  level!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @IsString()
  @IsOptional()
  primaryLanguage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  goals?: string[];

  @IsString()
  @IsOptional()
  intensity?: string;

  @IsString()
  @IsOptional()
  customGoal?: string;
}

export class UpdateOnboardingDto {
  @IsNumber()
  step!: number;

  @IsOptional()
  data?: any;
}

@Controller("placement-test")
@UseGuards(UserJwtGuard)
export class PlacementTestController {
  constructor(private readonly placementTestService: PlacementTestService) {}

  @Get("question")
  getNextQuestion(@CurrentUserId() userId: string) {
    return this.placementTestService.getNextQuestion(userId);
  }

  @Post("answer")
  submitAnswer(@CurrentUserId() userId: string, @Body() body: SubmitAnswerDto) {
    return this.placementTestService.submitAnswer(
      userId,
      body.challengeId,
      body.selectedOptionId
    );
  }

  @Post("confirm")
  confirmLevel(@CurrentUserId() userId: string, @Body() body: ConfirmLevelDto) {
    return this.placementTestService.confirmLevel(
      userId,
      body.level,
      body.languages,
      body.goals,
      body.intensity,
      body.primaryLanguage,
      body.customGoal
    );
  }

  @Post("reset")
  resetTest(@CurrentUserId() userId: string) {
    return this.placementTestService.resetTest(userId);
  }

  @Post("onboarding")
  updateOnboarding(
    @CurrentUserId() userId: string,
    @Body() body: UpdateOnboardingDto
  ) {
    return this.placementTestService.updateOnboardingState(
      userId,
      body.step,
      body.data
    );
  }
}
