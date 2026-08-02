import { BadRequestException, Injectable } from "@nestjs/common";

import { SystemSettingsReader } from "../system-settings.reader";

@Injectable()
export class GetSettingUseCase {
  constructor(private readonly settings: SystemSettingsReader) {}

  async execute(key: string) {
    if (key !== "MAX_HEARTS") {
      throw new BadRequestException("INVALID_SETTING_KEY");
    }
    return String(await this.settings.get("maxHearts"));
  }
}
