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
import { CoursesService } from "../courses";
import { CompleteChallengeUseCase } from "./use-cases/complete-challenge.use-case";
import { ReduceHeartsUseCase } from "./use-cases/reduce-hearts.use-case";
import { RefillHeartsUseCase } from "./use-cases/refill-hearts.use-case";
import { ResetLessonProgressUseCase } from "./use-cases/reset-lesson-progress.use-case";
import { SelectActiveCourseUseCase } from "./use-cases/select-active-course.use-case";

@Controller("progress")
@UseGuards(UserJwtGuard)
export class ProgressController {
  constructor(
    private readonly courses: CoursesService,
    private readonly selectActiveCourse: SelectActiveCourseUseCase,
    private readonly reduceHeartsGoal: ReduceHeartsUseCase,
    private readonly refillHeartsGoal: RefillHeartsUseCase,
    private readonly completeChallengeGoal: CompleteChallengeUseCase,
    private readonly resetLessonProgressGoal: ResetLessonProgressUseCase
  ) {}

  @Get("user-progress")
  getUserProgress(@CurrentUserId() userId: string) {
    return this.courses.getUserProgress(userId);
  }

  @Get("course-progress")
  getCourseProgress(@CurrentUserId() userId: string) {
    return this.courses.getCourseProgress(userId);
  }

  @Get("lesson-percentage")
  getLessonPercentage(@CurrentUserId() userId: string) {
    return this.courses.getLessonPercentage(userId);
  }

  @Post("courses/:id")
  selectCourse(
    @CurrentUserId() userId: string,
    @Param("id", ParseIntPipe) id: number
  ) {
    return this.selectActiveCourse.execute(userId, id);
  }

  @Post("hearts/:challengeId/reduce")
  reduceHearts(
    @CurrentUserId() userId: string,
    @Param("challengeId", ParseIntPipe) challengeId: number
  ) {
    return this.reduceHeartsGoal.execute(userId, challengeId);
  }

  @Post("hearts/refill")
  refillHearts(@CurrentUserId() userId: string) {
    return this.refillHeartsGoal.execute(userId);
  }

  @Post("challenges/:id")
  completeChallenge(
    @CurrentUserId() userId: string,
    @Param("id", ParseIntPipe) id: number
  ) {
    return this.completeChallengeGoal.execute(userId, id);
  }

  @Post("lessons/:lessonId/reset")
  resetLessonProgress(
    @CurrentUserId() userId: string,
    @Param("lessonId", ParseIntPipe) lessonId: number
  ) {
    return this.resetLessonProgressGoal.execute(userId, lessonId);
  }
}
