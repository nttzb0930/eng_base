import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapCourse } from "../mappers/course-content.mapper";

@Injectable()
export class ListAdminCoursesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query?: Parameters<PrismaService["courses"]["findMany"]>[0],
    includeTotal = false
  ) {
    const [items, total] = await Promise.all([
      query
        ? this.prisma.courses.findMany(query)
        : this.prisma.courses.findMany(),
      includeTotal
        ? this.prisma.courses.count({ where: query?.where })
        : Promise.resolve(undefined),
    ]);

    return { data: items.map(mapCourse), total };
  }
}
