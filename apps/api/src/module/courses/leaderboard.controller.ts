import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { GetLeaderboardUseCase } from "./use-cases/get-leaderboard.use-case";

@Controller("leaderboard")
@UseGuards(UserJwtGuard)
export class LeaderboardController {
  constructor(private readonly getLeaderboardGoal: GetLeaderboardUseCase) {}

  @Get()
  getLeaderboard() {
    return this.getLeaderboardGoal.execute();
  }
}
