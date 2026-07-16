import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { UnitCreateDto } from "../dto/course-content-management.dto";
import { mapUnit, toUnitCreateData } from "../mappers/course-content.mapper";

@Injectable()
export class CreateAdminUnitUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(body: UnitCreateDto) {
    return mapUnit(
      await this.prisma.units.create({ data: toUnitCreateData(body) })
    );
  }
}
