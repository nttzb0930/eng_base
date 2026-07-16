import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { ParsedListQuery } from "../../../common/decorators/filter-parse.decorator";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapPracticeSession } from "../practice-session.mapper";

@Injectable()
export class ListAdminPracticeSessionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ParsedListQuery, includeTotal = false) {
    const where = query.filters as Prisma.practice_sessionsWhereInput;
    const orderBy = query.sort.map(({ field, direction }) => ({
      [field]: direction,
    })) as Prisma.practice_sessionsOrderByWithRelationInput[];
    const [sessions, total] = await Promise.all([
      this.prisma.practice_sessions.findMany({
        where,
        orderBy,
        skip: query.offset,
        take: query.limit,
      }),
      includeTotal
        ? this.prisma.practice_sessions.count({ where })
        : Promise.resolve(undefined),
    ]);
    return { data: sessions.map(mapPracticeSession), total };
  }
}
