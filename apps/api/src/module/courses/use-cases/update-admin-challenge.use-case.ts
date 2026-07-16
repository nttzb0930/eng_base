import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { ChallengeUpdateDto } from "../dto/course-content-management.dto";
import {
  mapChallenge,
  toChallengeData,
} from "../mappers/course-content.mapper";

@Injectable()
export class UpdateAdminChallengeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number, body: ChallengeUpdateDto) {
    return mapChallenge(
      await this.prisma.challenges.update({
        where: { id },
        data: toChallengeData(body),
      })
    );
  }
}
