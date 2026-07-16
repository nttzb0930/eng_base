import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { DashboardController } from "./dashboard.controller";
import { GetDashboardStatsUseCase } from "./use-cases/get-dashboard-stats.use-case";

@Module({
  controllers: [DashboardController],
  providers: [GetDashboardStatsUseCase, UserJwtGuard],
})
export class DashboardModule {}
