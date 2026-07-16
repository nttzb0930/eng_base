import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapChallenge } from "../mappers/course-content.mapper";

@Injectable()
export class ListAdminChallengesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query?: Parameters<PrismaService["challenges"]["findMany"]>[0],
    includeTotal = false
  ) {
    const [items, total] = await Promise.all([
      query
        ? this.prisma.challenges.findMany(query)
        : this.prisma.challenges.findMany(),
      includeTotal
        ? this.prisma.challenges.count({ where: query?.where })
        : Promise.resolve(undefined),
    ]);

    return { data: items.map(mapChallenge), total };
  }
}
