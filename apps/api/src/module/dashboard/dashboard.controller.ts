import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(UserJwtGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(@CurrentUserId() userId: string) {
    return this.dashboardService.getDashboardStats(userId);
  }
}
