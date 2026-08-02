import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { SystemSettingsReader } from "../../settings";

@Injectable()
export class RefillHeartsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SystemSettingsReader,
  ) {}

  async execute(userId: string) {
    const maxHearts = await this.settings.get("maxHearts");
    const updated = await this.prisma.user_progress.updateMany({
      where: { user_id: userId },
      data: { hearts: maxHearts },
    });
    if (updated.count === 0) {
      throw new NotFoundException("User progress not found.");
    }
    return this.prisma.user_progress.findUnique({ where: { user_id: userId } });
  }
}
