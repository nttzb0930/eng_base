import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../database/prisma/prisma.service";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string, defaultValue = "") {
    const setting = await this.prisma.system_settings.findUnique({
      where: { key },
    });
    return setting?.value ?? defaultValue;
  }

  async set(key: string, value: string) {
    await this.prisma.system_settings.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
