import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CoursesModule } from "../courses";
import { ProgressController } from "./progress.controller";
import { CompleteChallengeUseCase } from "./use-cases/complete-challenge.use-case";
import { ReduceHeartsUseCase } from "./use-cases/reduce-hearts.use-case";
import { RefillHeartsUseCase } from "./use-cases/refill-hearts.use-case";
import { ResetLessonProgressUseCase } from "./use-cases/reset-lesson-progress.use-case";
import { SelectActiveCourseUseCase } from "./use-cases/select-active-course.use-case";

@Module({
  imports: [CoursesModule],
  controllers: [ProgressController],
  providers: [
    SelectActiveCourseUseCase,
    ReduceHeartsUseCase,
    RefillHeartsUseCase,
    CompleteChallengeUseCase,
    ResetLessonProgressUseCase,
    UserJwtGuard,
  ],
})
export class ProgressModule {}
