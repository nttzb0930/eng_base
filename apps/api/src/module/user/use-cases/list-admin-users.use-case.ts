import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { ParsedListQuery } from "../../../common/decorators/filter-parse.decorator";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapUser } from "../mappers/user.mapper";

@Injectable()
export class ListAdminUsersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ParsedListQuery, includeTotal = false) {
    const where = query.filters as Prisma.usersWhereInput;
    const orderBy = query.sort.map(({ field, direction }) => ({
      [field]: direction,
    })) as Prisma.usersOrderByWithRelationInput[];
    const [users, total] = await Promise.all([
      this.prisma.users.findMany({
        where,
        orderBy,
        skip: query.offset,
        take: query.limit,
      }),
      includeTotal
        ? this.prisma.users.count({ where })
        : Promise.resolve(undefined),
    ]);
    return { data: users.map(mapUser), total };
  }
}
