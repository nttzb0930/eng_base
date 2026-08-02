import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  getSystemSettingDefinition,
  parseSystemSettingInput,
  serializeSystemSetting,
} from "../system-setting.registry";

@Injectable()
export class UpdateSettingUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(key: string, rawValue: string) {
    if (key !== "MAX_HEARTS") {
      throw new BadRequestException("INVALID_SETTING_KEY");
    }

    const value = parseSystemSettingInput("maxHearts", rawValue);
    if (value === undefined) {
      throw new BadRequestException("INVALID_SETTING_VALUE");
    }
    const definition = getSystemSettingDefinition("maxHearts");
    const serialized = serializeSystemSetting("maxHearts", value);
    await this.prisma.system_settings.upsert({
      where: { key: definition.key },
      create: { key: definition.key, value: serialized },
      update: { value: serialized },
    });
  }
}
