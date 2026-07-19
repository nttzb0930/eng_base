import { Controller, Get, Inject } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";

import { applicationConfig } from "../../config";

@Controller("health")
export class HealthController {
  constructor(
    @Inject(applicationConfig.KEY)
    private readonly application: ConfigType<typeof applicationConfig>
  ) {}

  @Get()
  getHealth() {
    return {
      status: "ok",
      service: this.application.serviceName,
    };
  }
}
