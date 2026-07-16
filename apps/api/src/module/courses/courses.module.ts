import { Module } from "@nestjs/common";
import { AdminJwtGuard } from "../../auth/admin-jwt.guard";
import { UserJwtGuard } from "../../auth/user-jwt.guard";
import { CoursesController } from "./courses.controller";
import { UnitsController } from "./units.controller";
import { LessonsController } from "./lessons.controller";
import { LeaderboardController } from "./leaderboard.controller";
import { CoursesService } from "./courses.service";
import { CourseManagementController } from "./management/course-management.controller";
import { CourseManagementService } from "./management/course-management.service";

@Module({
  controllers: [
    CoursesController,
    UnitsController,
    LessonsController,
    LeaderboardController,
    CourseManagementController,
  ],
  providers: [
    CoursesService,
    CourseManagementService,
    UserJwtGuard,
    AdminJwtGuard,
  ],
  exports: [CoursesService],
})
export class CoursesModule {}
