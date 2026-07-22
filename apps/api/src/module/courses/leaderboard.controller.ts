import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { GetLeaderboardUseCase } from "./use-cases/get-leaderboard.use-case";

@Controller("leaderboard")
@UseGuards(UserJwtGuard)
export class LeaderboardController {
  constructor(private readonly getLeaderboardGoal: GetLeaderboardUseCase) {}

  @Get()
  getLeaderboard(
    @CurrentUserId() userId: string,
    @Query("period") period?: string,
  ) {
    return this.getLeaderboardGoal.execute(userId, period);
  }
}

