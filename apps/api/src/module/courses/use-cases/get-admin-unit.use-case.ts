import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapUnit } from "../mappers/course-content.mapper";

@Injectable()
export class GetAdminUnitUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    const item = await this.prisma.units.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
    return mapUnit(item);
  }
}
