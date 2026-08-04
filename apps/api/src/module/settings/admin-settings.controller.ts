import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";

import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { UpdateSettingDto } from "./dto/update-setting.dto";
import { UpdateSystemSettingsDto } from "./dto/update-system-settings.dto";
import { GetSettingUseCase } from "./use-cases/get-setting.use-case";
import { GetSystemSettingsUseCase } from "./use-cases/get-system-settings.use-case";
import { UpdateSettingUseCase } from "./use-cases/update-setting.use-case";
import { UpdateSystemSettingsUseCase } from "./use-cases/update-system-settings.use-case";

@Controller("admin/settings")
@UseGuards(AdminJwtGuard)
export class AdminSettingsController {
  constructor(
    private readonly getSetting: GetSettingUseCase,
    private readonly updateSetting: UpdateSettingUseCase,
    private readonly getSystemSettings: GetSystemSettingsUseCase,
    private readonly updateSystemSettings: UpdateSystemSettingsUseCase,
  ) {}

  @Get()
  getAll() {
    return this.getSystemSettings.execute();
  }

  @Put()
  updateAll(@Body() body: UpdateSystemSettingsDto) {
    return this.updateSystemSettings.execute(body);
  }

  @Get(":key")
  get(@Param("key") key: string) {
    return this.getSetting.execute(key);
  }

  @Post(":key")
  set(@Param("key") key: string, @Body() body: UpdateSettingDto) {
    return this.updateSetting.execute(key, body.value);
  }
}
