import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapLesson } from "../mappers/course-content.mapper";

@Injectable()
export class ListAdminLessonsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query?: Parameters<PrismaService["lessons"]["findMany"]>[0],
    includeTotal = false
  ) {
    const [items, total] = await Promise.all([
      query
        ? this.prisma.lessons.findMany(query)
        : this.prisma.lessons.findMany(),
      includeTotal
        ? this.prisma.lessons.count({ where: query?.where })
        : Promise.resolve(undefined),
    ]);

    return { data: items.map(mapLesson), total };
  }
}
