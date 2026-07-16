import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../auth/user-jwt.guard";
import { CoursesController } from "./courses.controller";
import { UnitsController } from "./units.controller";
import { LessonsController } from "./lessons.controller";
import { LeaderboardController } from "./leaderboard.controller";
import { CoursesService } from "./courses.service";

@Module({
  controllers: [
    CoursesController,
    UnitsController,
    LessonsController,
    LeaderboardController,
  ],
  providers: [CoursesService, UserJwtGuard],
  exports: [CoursesService],
})
export class CoursesModule {}
