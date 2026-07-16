import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { ChallengeOptionUpdateDto } from "../dto/course-content-management.dto";
import {
  mapChallengeOption,
  toChallengeOptionData,
} from "../mappers/course-content.mapper";

@Injectable()
export class UpdateAdminChallengeOptionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number, body: ChallengeOptionUpdateDto) {
    return mapChallengeOption(
      await this.prisma.challenge_options.update({
        where: { id },
        data: toChallengeOptionData(body),
      })
    );
  }
}
