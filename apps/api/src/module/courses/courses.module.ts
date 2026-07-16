import { Module } from "@nestjs/common";
import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CoursesController } from "./courses.controller";
import { UnitsController } from "./units.controller";
import { LessonsController } from "./lessons.controller";
import { LeaderboardController } from "./leaderboard.controller";
import { CoursesService } from "./courses.service";
import { AdminCoursesController } from "./admin-courses.controller";
import { AdminUnitsController } from "./admin-units.controller";
import { AdminLessonsController } from "./admin-lessons.controller";
import { AdminChallengesController } from "./admin-challenges.controller";
import { AdminChallengeOptionsController } from "./admin-challenge-options.controller";
import { ADMIN_COURSE_CONTENT_USE_CASES } from "./use-cases";

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
    CoursesService,
    ...ADMIN_COURSE_CONTENT_USE_CASES,
    UserJwtGuard,
    AdminJwtGuard,
  ],
  exports: [CoursesService],
})
export class CoursesModule {}
