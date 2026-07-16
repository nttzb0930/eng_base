import { Module } from "@nestjs/common";
import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CoursesController } from "./courses.controller";
import { UnitsController } from "./units.controller";
import { LessonsController } from "./lessons.controller";
import { LeaderboardController } from "./leaderboard.controller";
import { AdminCoursesController } from "./admin-courses.controller";
import { AdminUnitsController } from "./admin-units.controller";
import { AdminLessonsController } from "./admin-lessons.controller";
import { AdminChallengesController } from "./admin-challenges.controller";
import { AdminChallengeOptionsController } from "./admin-challenge-options.controller";
import { ADMIN_COURSE_CONTENT_USE_CASES } from "./use-cases";
import { GetCourseProgressUseCase } from "./use-cases/get-course-progress.use-case";
import { GetCourseUnitsUseCase } from "./use-cases/get-course-units.use-case";
import { GetCourseUseCase } from "./use-cases/get-course.use-case";
import { GetCurrentLessonUseCase } from "./use-cases/get-current-lesson.use-case";
import { GetLeaderboardUseCase } from "./use-cases/get-leaderboard.use-case";
import { GetLessonPercentageUseCase } from "./use-cases/get-lesson-percentage.use-case";
import { GetUserProgressUseCase } from "./use-cases/get-user-progress.use-case";
import { ListCoursesUseCase } from "./use-cases/list-courses.use-case";

@Module({
  controllers: [
    CoursesController,
    UnitsController,
    LessonsController,
    LeaderboardController,
    AdminCoursesController,
    AdminUnitsController,
    AdminLessonsController,
    AdminChallengesController,
    AdminChallengeOptionsController,
  ],
  providers: [
    ListCoursesUseCase,
    GetCourseUseCase,
    GetUserProgressUseCase,
    GetCourseUnitsUseCase,
    GetCourseProgressUseCase,
    GetCurrentLessonUseCase,
    GetLessonPercentageUseCase,
    GetLeaderboardUseCase,
    ...ADMIN_COURSE_CONTENT_USE_CASES,
    UserJwtGuard,
    AdminJwtGuard,
  ],
  exports: [
    GetCourseUseCase,
    GetUserProgressUseCase,
    GetCourseProgressUseCase,
    GetLessonPercentageUseCase,
  ],
})
export class CoursesModule {}
