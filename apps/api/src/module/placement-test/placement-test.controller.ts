import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
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
  getNextQuestion() {
    return this.placementTestService.getNextQuestion();
  }

  @Post("answer")
  submitAnswer(@Body() body: SubmitAnswerDto) {
    return this.placementTestService.submitAnswer(
      body.challengeId,
      body.selectedOptionId
    );
  }

  @Post("confirm")
  confirmLevel(@Body() body: ConfirmLevelDto) {
    return this.placementTestService.confirmLevel(
      body.level,
      body.languages,
      body.goals,
      body.intensity,
      body.primaryLanguage,
      body.customGoal
    );
  }

  @Post("reset")
  resetTest() {
    return this.placementTestService.resetTest();
  }

  @Post("onboarding")
  updateOnboarding(@Body() body: UpdateOnboardingDto) {
    return this.placementTestService.updateOnboardingState(
      body.step,
      body.data
    );
  }
}
