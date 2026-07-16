import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../auth/user-jwt.guard";
import { CoursesService } from "./courses.service";

@Controller("leaderboard")
@UseGuards(UserJwtGuard)
export class LeaderboardController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  getLeaderboard() {
    return this.coursesService.getTopTenUsers();
  }
}
