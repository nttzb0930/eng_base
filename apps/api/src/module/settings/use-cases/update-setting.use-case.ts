import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class UpdateSettingUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(key: string, value: string) {
    await this.prisma.system_settings.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
