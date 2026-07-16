import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { ParsedListQuery } from "../../../common/decorators/filter-parse.decorator";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapChallengeOption } from "../mappers/course-content.mapper";

@Injectable()
export class ListAdminChallengeOptionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ParsedListQuery, includeTotal = false) {
    const where = query.filters as Prisma.challenge_optionsWhereInput;
    const orderBy = query.sort.map(({ field, direction }) => ({
      [field]: direction,
    })) as Prisma.challenge_optionsOrderByWithRelationInput[];
    const [items, total] = await Promise.all([
      this.prisma.challenge_options.findMany({
        where,
        orderBy,
        skip: query.offset,
        take: query.limit,
      }),
      includeTotal
        ? this.prisma.challenge_options.count({ where })
        : Promise.resolve(undefined),
    ]);
    return { data: items.map(mapChallengeOption), total };
  }
}
