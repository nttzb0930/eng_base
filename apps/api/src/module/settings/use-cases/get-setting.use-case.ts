import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class GetSettingUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(key: string, defaultValue = "") {
    const setting = await this.prisma.system_settings.findUnique({
      where: { key },
    });
    return setting?.value ?? defaultValue;
  }
}
