import { Module } from "@nestjs/common";
import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CoursesController } from "./courses.controller";
import { UnitsController } from "./units.controller";
import { LessonsController } from "./lessons.controller";
import { LeaderboardController } from "./leaderboard.controller";
import { CoursesService } from "./courses.service";
import { AdminCourseContentController } from "./admin-course-content.controller";
import { CourseContentManagementUseCases } from "./use-cases/course-content-management.use-cases";

@Module({
  controllers: [
    CoursesController,
    UnitsController,
    LessonsController,
    LeaderboardController,
    AdminCourseContentController,
  ],
  providers: [
    CoursesService,
    CourseContentManagementUseCases,
    UserJwtGuard,
    AdminJwtGuard,
  ],
  exports: [CoursesService],
})
export class CoursesModule {}
