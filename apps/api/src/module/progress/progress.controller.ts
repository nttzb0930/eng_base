import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../auth";
import { ProgressService } from "./progress.service";

@Controller("progress")
@UseGuards(UserJwtGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get("user-progress")
  getUserProgress() {
    return this.progressService.getUserProgress();
  }

  @Get("course-progress")
  getCourseProgress() {
    return this.progressService.getCourseProgress();
  }

  @Get("lesson-percentage")
  getLessonPercentage() {
    return this.progressService.getLessonPercentage();
  }

  @Post("courses/:id")
  selectCourse(@Param("id", ParseIntPipe) id: number) {
    return this.progressService.upsertUserProgress(id);
  }

  @Post("hearts/:challengeId/reduce")
  reduceHearts(@Param("challengeId", ParseIntPipe) challengeId: number) {
    return this.progressService.reduceHearts(challengeId);
  }

  @Post("hearts/refill")
  refillHearts() {
    return this.progressService.refillHearts();
  }

  @Post("challenges/:id")
  completeChallenge(@Param("id", ParseIntPipe) id: number) {
    return this.progressService.upsertChallengeProgress(id);
  }

  @Post("lessons/:lessonId/reset")
  resetLessonProgress(@Param("lessonId", ParseIntPipe) lessonId: number) {
    return this.progressService.resetLessonProgress(lessonId);
  }
}
