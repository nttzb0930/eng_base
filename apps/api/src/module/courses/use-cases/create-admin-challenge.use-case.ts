import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { ChallengeCreateDto } from "../dto/course-content-management.dto";
import {
  mapChallenge,
  toChallengeCreateData,
} from "../mappers/course-content.mapper";

@Injectable()
export class CreateAdminChallengeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(body: ChallengeCreateDto) {
    return mapChallenge(
      await this.prisma.challenges.create({ data: toChallengeCreateData(body) })
    );
  }
}
