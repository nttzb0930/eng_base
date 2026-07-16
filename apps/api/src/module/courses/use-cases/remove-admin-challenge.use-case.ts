import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapChallenge } from "../mappers/course-content.mapper";

@Injectable()
export class RemoveAdminChallengeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    return mapChallenge(await this.prisma.challenges.delete({ where: { id } }));
  }
}
