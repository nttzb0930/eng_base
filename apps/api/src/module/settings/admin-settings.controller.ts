import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";

import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { SettingsService } from "./settings.service";

@Controller("admin/settings")
@UseGuards(AdminJwtGuard)
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get(":key")
  get(@Param("key") key: string) {
    return this.settings.get(key, key === "MAX_HEARTS" ? "5" : "");
  }

  @Post(":key")
  set(@Param("key") key: string, @Body() body: { value: string }) {
    return this.settings.set(key, body.value);
  }
}
