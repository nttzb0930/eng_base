import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapPracticeSession } from "../practice-session.mapper";

@Injectable()
export class ListAdminPracticeSessionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query?: Prisma.practice_sessionsFindManyArgs,
    includeTotal = false
  ) {
    const [sessions, total] = await Promise.all([
      this.prisma.practice_sessions.findMany(query),
      includeTotal
        ? this.prisma.practice_sessions.count({ where: query?.where })
        : Promise.resolve(undefined),
    ]);
    return { data: sessions.map(mapPracticeSession), total };
  }
}
