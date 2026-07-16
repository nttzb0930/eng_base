import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapChallengeOption } from "../mappers/course-content.mapper";

@Injectable()
export class GetAdminChallengeOptionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    const item = await this.prisma.challenge_options.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Challenge option with ID ${id} not found`);
    }
    return mapChallengeOption(item);
  }
}
