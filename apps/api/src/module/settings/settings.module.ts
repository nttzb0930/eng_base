import { Module } from "@nestjs/common";

import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { AdminSettingsController } from "./admin-settings.controller";
import { GetSettingUseCase } from "./use-cases/get-setting.use-case";
import { UpdateSettingUseCase } from "./use-cases/update-setting.use-case";

@Module({
  imports: [PrismaModule],
  controllers: [AdminSettingsController],
  providers: [GetSettingUseCase, UpdateSettingUseCase, AdminJwtGuard],
})
export class SettingsModule {}
