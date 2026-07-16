import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { ChallengeOptionCreateDto } from "../dto/course-content-management.dto";
import {
  mapChallengeOption,
  toChallengeOptionCreateData,
} from "../mappers/course-content.mapper";

@Injectable()
export class CreateAdminChallengeOptionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(body: ChallengeOptionCreateDto) {
    return mapChallengeOption(
      await this.prisma.challenge_options.create({
        data: toChallengeOptionCreateData(body),
      })
    );
  }
}
