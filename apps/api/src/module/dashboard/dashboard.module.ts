import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../auth";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, UserJwtGuard],
})
export class DashboardModule {}
