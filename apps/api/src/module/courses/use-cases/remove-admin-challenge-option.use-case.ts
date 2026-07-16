import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapChallengeOption } from "../mappers/course-content.mapper";

@Injectable()
export class RemoveAdminChallengeOptionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    return mapChallengeOption(
      await this.prisma.challenge_options.delete({ where: { id } })
    );
  }
}
