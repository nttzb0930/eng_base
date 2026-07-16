import { Module } from "@nestjs/common";

import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { AdminSettingsController } from "./admin-settings.controller";
import { SettingsService } from "./settings.service";

@Module({
  imports: [PrismaModule],
  controllers: [AdminSettingsController],
  providers: [SettingsService, AdminJwtGuard],
})
export class SettingsModule {}
