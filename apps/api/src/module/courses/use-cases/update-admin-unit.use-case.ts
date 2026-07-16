import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { UnitUpdateDto } from "../dto/course-content-management.dto";
import { mapUnit, toUnitData } from "../mappers/course-content.mapper";

@Injectable()
export class UpdateAdminUnitUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number, body: UnitUpdateDto) {
    return mapUnit(
      await this.prisma.units.update({
        where: { id },
        data: toUnitData(body),
      })
    );
  }
}
