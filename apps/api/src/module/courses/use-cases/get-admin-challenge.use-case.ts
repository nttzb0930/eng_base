import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapChallenge } from "../mappers/course-content.mapper";

@Injectable()
export class GetAdminChallengeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    const item = await this.prisma.challenges.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Challenge with ID ${id} not found`);
    }
    return mapChallenge(item);
  }
}
