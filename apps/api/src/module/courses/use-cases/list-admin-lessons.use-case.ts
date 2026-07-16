import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { ParsedListQuery } from "../../../common/decorators/filter-parse.decorator";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapLesson } from "../mappers/course-content.mapper";

@Injectable()
export class ListAdminLessonsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ParsedListQuery, includeTotal = false) {
    const where = query.filters as Prisma.lessonsWhereInput;
    const orderBy = query.sort.map(({ field, direction }) => ({
      [field]: direction,
    })) as Prisma.lessonsOrderByWithRelationInput[];
    const [items, total] = await Promise.all([
      this.prisma.lessons.findMany({
        where,
        orderBy,
        skip: query.offset,
        take: query.limit,
      }),
      includeTotal
        ? this.prisma.lessons.count({ where })
        : Promise.resolve(undefined),
    ]);
    return { data: items.map(mapLesson), total };
  }
}
