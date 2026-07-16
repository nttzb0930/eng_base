import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../auth";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(UserJwtGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard() {
    return this.dashboardService.getDashboardStats();
  }
}
