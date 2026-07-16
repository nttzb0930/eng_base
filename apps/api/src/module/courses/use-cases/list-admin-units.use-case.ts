import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapUnit } from "../mappers/course-content.mapper";

@Injectable()
export class ListAdminUnitsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query?: Parameters<PrismaService["units"]["findMany"]>[0],
    includeTotal = false
  ) {
    const [items, total] = await Promise.all([
      query ? this.prisma.units.findMany(query) : this.prisma.units.findMany(),
      includeTotal
        ? this.prisma.units.count({ where: query?.where })
        : Promise.resolve(undefined),
    ]);

    return { data: items.map(mapUnit), total };
  }
}
