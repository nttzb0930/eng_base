import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { GetDashboardStatsUseCase } from "./use-cases/get-dashboard-stats.use-case";

@Controller("dashboard")
@UseGuards(UserJwtGuard)
export class DashboardController {
  constructor(private readonly getDashboardStats: GetDashboardStatsUseCase) {}

  @Get()
  getDashboard(@CurrentUserId() userId: string) {
    return this.getDashboardStats.execute(userId);
  }
}
