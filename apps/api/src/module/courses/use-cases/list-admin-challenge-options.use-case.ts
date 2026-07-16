import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapChallengeOption } from "../mappers/course-content.mapper";

@Injectable()
export class ListAdminChallengeOptionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query?: Parameters<PrismaService["challenge_options"]["findMany"]>[0],
    includeTotal = false
  ) {
    const [items, total] = await Promise.all([
      query
        ? this.prisma.challenge_options.findMany(query)
        : this.prisma.challenge_options.findMany(),
      includeTotal
        ? this.prisma.challenge_options.count({ where: query?.where })
        : Promise.resolve(undefined),
    ]);

    return { data: items.map(mapChallengeOption), total };
  }
}
