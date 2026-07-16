import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";

import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { UpdateSettingDto } from "./dto/update-setting.dto";
import { GetSettingUseCase } from "./use-cases/get-setting.use-case";
import { UpdateSettingUseCase } from "./use-cases/update-setting.use-case";

@Controller("admin/settings")
@UseGuards(AdminJwtGuard)
export class AdminSettingsController {
  constructor(
    private readonly getSetting: GetSettingUseCase,
    private readonly updateSetting: UpdateSettingUseCase
  ) {}

  @Get(":key")
  get(@Param("key") key: string) {
    return this.getSetting.execute(key, key === "MAX_HEARTS" ? "5" : "");
  }

  @Post(":key")
  set(@Param("key") key: string, @Body() body: UpdateSettingDto) {
    return this.updateSetting.execute(key, body.value);
  }
}
