import { Injectable } from "@nestjs/common";
import type { UpdateSystemSettingsPayload } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  SYSTEM_SETTING_FIELDS,
  getSystemSettingDefinition,
  serializeSystemSetting,
} from "../system-setting.registry";
import { SystemSettingsReader } from "../system-settings.reader";

@Injectable()
export class UpdateSystemSettingsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SystemSettingsReader,
  ) {}

  async execute(payload: UpdateSystemSettingsPayload) {
    const upserts = SYSTEM_SETTING_FIELDS.flatMap((field) => {
      const value = payload[field];
      if (value === undefined) return [];

      const definition = getSystemSettingDefinition(field);
      const serialized = serializeSystemSetting(field, value);
      return [
        this.prisma.system_settings.upsert({
          where: { key: definition.key },
          create: { key: definition.key, value: serialized },
          update: { value: serialized },
        }),
      ];
    });

    if (upserts.length > 0) {
      await this.prisma.$transaction(upserts);
    }

    return this.settings.getAll();
  }
}
