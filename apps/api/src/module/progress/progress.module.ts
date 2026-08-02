import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CoursesModule } from "../courses";
import { SettingsModule } from "../settings";
import { ProgressController } from "./progress.controller";
import { CompleteChallengeUseCase } from "./use-cases/complete-challenge.use-case";
import { GetCefrLevelProgressUseCase } from "./use-cases/get-cefr-level-progress.use-case";
import { ReduceHeartsUseCase } from "./use-cases/reduce-hearts.use-case";
import { RefillHeartsUseCase } from "./use-cases/refill-hearts.use-case";
import { ResetLessonProgressUseCase } from "./use-cases/reset-lesson-progress.use-case";
import { SelectActiveCourseUseCase } from "./use-cases/select-active-course.use-case";

@Module({
  imports: [CoursesModule, SettingsModule],
  controllers: [ProgressController],
  providers: [
    SelectActiveCourseUseCase,
    ReduceHeartsUseCase,
    RefillHeartsUseCase,
    CompleteChallengeUseCase,
    ResetLessonProgressUseCase,
    GetCefrLevelProgressUseCase,
    UserJwtGuard,
  ],
})
export class ProgressModule {}
