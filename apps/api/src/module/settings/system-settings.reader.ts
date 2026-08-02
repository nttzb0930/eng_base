import { Injectable } from "@nestjs/common";
import type { SystemSettings } from "@repo/shared";

import { PrismaService } from "../../database/prisma/prisma.service";
import {
  SYSTEM_SETTING_STORAGE_KEYS,
  getEffectiveSystemSetting,
  getSystemSettingDefinition,
  type SystemSettingField,
} from "./system-setting.registry";

@Injectable()
export class SystemSettingsReader {
  constructor(private readonly prisma: PrismaService) {}

  async get<Field extends SystemSettingField>(
    field: Field,
  ): Promise<SystemSettings[Field]> {
    const definition = getSystemSettingDefinition(field);
    const setting = await this.prisma.system_settings.findUnique({
      where: { key: definition.key },
    });
    return getEffectiveSystemSetting(field, setting?.value);
  }

  async getAll(): Promise<SystemSettings> {
    const rows = await this.prisma.system_settings.findMany({
      where: { key: { in: [...SYSTEM_SETTING_STORAGE_KEYS] } },
    });
    const valuesByKey = new Map(rows.map((row) => [row.key, row.value]));
    const read = <Field extends SystemSettingField>(field: Field) => {
      const definition = getSystemSettingDefinition(field);
      return getEffectiveSystemSetting(field, valuesByKey.get(definition.key));
    };

    return {
      maxHearts: read("maxHearts"),
      practiceWordsPerLesson: read("practiceWordsPerLesson"),
      weakWordsLimit: read("weakWordsLimit"),
      dailyReviewRelaxedLimit: read("dailyReviewRelaxedLimit"),
      dailyReviewStandardLimit: read("dailyReviewStandardLimit"),
      dailyReviewAcceleratedLimit: read("dailyReviewAcceleratedLimit"),
      dailyReviewIntensiveLimit: read("dailyReviewIntensiveLimit"),
      registrationEnabled: read("registrationEnabled"),
    };
  }
}
