import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { ProgressService } from "./progress.service";

@Controller("progress")
@UseGuards(UserJwtGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get("user-progress")
  getUserProgress(@CurrentUserId() userId: string) {
    return this.progressService.getUserProgress(userId);
  }

  @Get("course-progress")
  getCourseProgress(@CurrentUserId() userId: string) {
    return this.progressService.getCourseProgress(userId);
  }

  @Get("lesson-percentage")
  getLessonPercentage(@CurrentUserId() userId: string) {
    return this.progressService.getLessonPercentage(userId);
  }

  @Post("courses/:id")
  selectCourse(
    @CurrentUserId() userId: string,
    @Param("id", ParseIntPipe) id: number
  ) {
    return this.progressService.upsertUserProgress(userId, id);
  }

  @Post("hearts/:challengeId/reduce")
  reduceHearts(
    @CurrentUserId() userId: string,
    @Param("challengeId", ParseIntPipe) challengeId: number
  ) {
    return this.progressService.reduceHearts(userId, challengeId);
  }

  @Post("hearts/refill")
  refillHearts(@CurrentUserId() userId: string) {
    return this.progressService.refillHearts(userId);
  }

  @Post("challenges/:id")
  completeChallenge(
    @CurrentUserId() userId: string,
    @Param("id", ParseIntPipe) id: number
  ) {
    return this.progressService.upsertChallengeProgress(userId, id);
  }

  @Post("lessons/:lessonId/reset")
  resetLessonProgress(
    @CurrentUserId() userId: string,
    @Param("lessonId", ParseIntPipe) lessonId: number
  ) {
    return this.progressService.resetLessonProgress(userId, lessonId);
  }
}
